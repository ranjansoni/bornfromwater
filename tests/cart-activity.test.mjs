import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { cartSnapshot, trackingIdentity, validCartOrigin } from '../src/lib/cart-activity.ts';
import { cartTracking, checkoutCartTracking } from '../src/lib/cart-tracking-client.ts';
import { createCartActivityStore } from '../src/lib/cart-activity-store.ts';
import { handleCartActivity } from '../src/lib/cart-activity-handler.ts';
import { createOrderStore } from '../src/lib/order-store.ts';
import { validateCart } from '../src/lib/orders.ts';
import { products } from '../src/lib/catalog-seed.ts';
import { config, vercelPurchaseEligibility } from './fixtures.mjs';

const db = new PGlite();
const migration = await readFile(new URL('../src/db/migrations/004-cart-activity.sql', import.meta.url), 'utf8');
await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
const query = { query: async (sql, params) => (await db.query(sql, params)).rows };
const store = createCartActivityStore(query);
const orders = createOrderStore(query);
const secret = 'test-only-observation-signing-secret';
const product = products.find(p => !p.placeholder);
const items = [{ slug: product.slug, quantity: 1 }];
const token = randomUUID();
const snapshot = (revision = 1, cart = items, browserToken = token, scope = config) => cartSnapshot({ token: browserToken, revision, items: cart }, scope, secret, products);
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
beforeEach(() => db.exec('TRUNCATE orders, cart_activity, cart_activity_limits CASCADE'));
after(() => db.close());
async function pending(scope = config) {
  const cart = validateCart(items, products);
  return orders.createPendingOrder(cart.lines, cart.totalCents, randomUUID(), scope.livemode, scope.accountId);
}
test('cart migration is repeatable and leaves original orders unchanged', async () => {
  await pending(); const before = (await db.query('SELECT * FROM orders')).rows;
  await db.exec(migration); await db.exec(migration);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, before);
});
test('browser identity rotates after an empty cart or expiry and storage failure never blocks checkout', () => {
  const local = storage(); let id = randomUUID(); const uuid = () => id;
  assert.equal(cartTracking([], local, 1000, uuid), undefined);
  const initial = cartTracking(items, local, 1000, uuid);
  assert.equal(cartTracking(items, local, 1000, uuid).revision, initial.revision + 1);
  assert.equal(cartTracking([], local, 1001, uuid).token, initial.token);
  id = randomUUID(); assert.equal(cartTracking(items, local, 1002, uuid).token, id);
  id = randomUUID(); assert.equal(cartTracking(items, local, 31 * 86400000, uuid).token, id);
  assert.equal(cartTracking(items, { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }), undefined);
  assert.equal(checkoutCartTracking(items, [{ ...items[0], quantity: 2 }]), undefined);
});
test('cart identities are scoped and snapshots use only validated catalogue prices', () => {
  const cart = cartSnapshot({ token, revision: 1, items: [{ ...items[0], unitPriceCents: 1 }], email: 'ignore@example.com' }, config, secret, products);
  assert.equal(cart.subtotal, product.priceCents); assert.notEqual(cart.id, token);
  assert.notEqual(cart.id, trackingIdentity({ token, revision: 1 }, { ...config, livemode: true }, secret).id);
  assert.notEqual(cart.id, trackingIdentity({ token, revision: 1 }, { ...config, accountId: 'acct_other' }, secret).id);
  assert.equal(JSON.stringify(cart).includes('ignore@example.com'), false);
  for (const value of [{ token: 'bad', revision: 1, items }, { token, revision: -1, items }, { token, revision: 1.5, items },
    { token, revision: 1, items: [...items, ...items] }, { token, revision: 1, items: [{ ...items[0], quantity: 1000 }] }]) {
    assert.throws(() => cartSnapshot(value, config, secret, products));
  }
});
test('older observations cannot resurrect a cleared cart or replace a newer snapshot', async () => {
  await store.observe(snapshot(2), config); await store.observe(snapshot(1, [{ ...items[0], quantity: 2 }]), config);
  assert.equal((await store.list(config, 'recent')).carts[0].subtotal, product.priceCents);
  await store.observe(snapshot(3, []), config); await store.observe(snapshot(2), config);
  assert.equal((await store.list(config, 'recent')).carts.length, 0);
});
test('only inactive carts become potentially abandoned; returning activity restores recent status', async () => {
  await store.observe(snapshot(), config);
  assert.equal((await store.list(config, 'abandoned')).carts.length, 0);
  await db.query("UPDATE cart_activity SET last_activity = now() - interval '24 hours' WHERE cart_id = $1", [snapshot().id]);
  const abandoned = await store.list(config, 'abandoned');
  assert.equal(abandoned.carts.length, 1); assert.equal(abandoned.counts.abandoned, 1);
  await store.observe(snapshot(2), config);
  assert.equal((await store.list(config, 'abandoned')).carts.length, 0);
  assert.equal((await store.list(config, 'recent')).counts.recent, 1);
});
test('paid and processing matching checkouts are excluded without relying on a return-page visit', async () => {
  const order = await pending(); const before = (await db.query('SELECT * FROM orders')).rows;
  await store.linkCheckout(snapshot(), order.orderId, config);
  assert.equal((await store.list(config, 'recent')).carts[0].orderId, order.orderId);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, before);
  for (const status of ['processing', 'approved']) {
    await db.query('UPDATE orders SET payment_status = $1 WHERE order_id = $2', [status, order.orderId]);
    assert.equal((await store.list(config, 'recent')).carts.length, 0);
  }
  await store.observe(snapshot(2, [{ ...items[0], quantity: 2 }]), config);
  const changed = (await store.list(config, 'recent')).carts;
  assert.equal(changed.length, 1); assert.equal(changed[0].orderId, null);
});
test('failed checkouts remain visible and mode/account boundaries cannot hide other carts', async () => {
  await store.observe(snapshot(), config);
  const other = await pending({ ...config, livemode: true });
  await store.linkCheckout(snapshot(), other.orderId, config);
  assert.equal((await store.list(config, 'recent')).carts[0].orderId, null);
  assert.equal((await store.list({ ...config, livemode: true }, 'recent')).carts.length, 0);
  assert.equal((await store.list({ ...config, accountId: 'acct_other' }, 'recent')).carts.length, 0);
  const order = await pending(); await store.linkCheckout(snapshot(2), order.orderId, config);
  for (const status of ['declined', 'expired']) {
    await db.query('UPDATE orders SET payment_status = $1 WHERE order_id = $2', [status, order.orderId]);
    assert.equal((await store.list(config, 'recent')).carts.length, 1);
  }
});
test('retention prunes expired cart observations and links while preserving their orders', async () => {
  const order = await pending(); await store.linkCheckout(snapshot(), order.orderId, config);
  const before = (await db.query('SELECT * FROM orders')).rows;
  await db.exec("UPDATE cart_activity SET last_activity = now() - interval '31 days'");
  const otherScope = { ...config, livemode: true };
  await store.observe(snapshot(1, items, randomUUID(), otherScope), otherScope);
  await db.exec("UPDATE cart_activity SET last_activity = now() - interval '31 days' WHERE stripe_livemode = true");
  assert.equal((await store.list(config, 'abandoned')).carts.length, 0);
  await store.allowObservation(config);
  assert.equal((await db.query('SELECT * FROM cart_activity WHERE stripe_livemode = false')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM cart_activity WHERE stripe_livemode = true')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM cart_checkout_links')).rows.length, 0);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, before);
});
test('public observation route rejects cross-site, invalid and oversized input without leaking cart data', async () => {
  const deps = { ...store, purchaseEligibility: vercelPurchaseEligibility, scope: () => config, snapshot: (value, scope) => cartSnapshot(value, scope, secret, products) };
  const request = (body, origin = config.origin) => new Request(`${config.origin}/api/cart-activity`, { method: 'POST',
    headers: { origin, 'Content-Type': 'application/json', 'x-vercel-ip-country': 'CA' }, body: JSON.stringify(body) });
  assert.equal((await handleCartActivity(request({ token, revision: 1, items }, 'https://other.example'), deps)).status, 403);
  assert.equal((await handleCartActivity(request({ token, revision: 1, items: [] }, ''), deps)).status, 403);
  assert.equal((await handleCartActivity(request({ token, revision: 1, items: [{ slug: 'missing', quantity: 1 }] }), deps)).status, 400);
  assert.equal((await handleCartActivity(request({ extra: 'x'.repeat(13000) }), deps)).status, 400);
  const response = await handleCartActivity(request({ token, revision: 1, items }), deps);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(validCartOrigin(new Request(config.origin, { headers: { origin: config.origin, 'sec-fetch-site': 'cross-site' } }), config), false);
});
test('observation throttling is persistent and failures are generic', async () => {
  await store.allowObservation(config);
  await db.exec('UPDATE cart_activity_limits SET attempts = 10000');
  const deps = { ...store, purchaseEligibility: vercelPurchaseEligibility, scope: () => config, snapshot: (value, scope) => cartSnapshot(value, scope, secret, products) };
  const request = () => new Request(`${config.origin}/api/cart-activity`, { method: 'POST', headers: { origin: config.origin, 'Content-Type': 'application/json', 'x-vercel-ip-country': 'CA' }, body: JSON.stringify({ token, revision: 1, items }) });
  assert.equal((await handleCartActivity(request(), deps)).status, 429);
  await db.exec("UPDATE cart_activity_limits SET window_start = now() - interval '2 hours'");
  assert.equal((await handleCartActivity(request(), deps)).status, 200);
  const failed = await handleCartActivity(request(), { ...deps, observe: async () => { throw new Error('private database details'); } });
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { ok: false });
});
