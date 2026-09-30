import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createAdminOrderStore, OrderConflictError } from '../src/lib/admin-order-store.ts';
import { validateFulfillmentUpdate } from '../src/lib/order-management.ts';
import { handleOrderUpdate } from '../src/lib/admin-handlers.ts';
import { adminConfiguration, createAdminSession, adminCookieName, hashAdminPassword } from '../src/lib/admin-auth.ts';
import { orderId, accountId } from './fixtures.mjs';

const db = new PGlite();
await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../src/db/migrations/002-order-management.sql', import.meta.url), 'utf8');
await db.exec(migration);
const store = createAdminOrderStore({ query: async (sql, params) => (await db.query(sql, params)).rows });
const scope = { accountId, livemode: false };
const contact = { name: 'Test Buyer', email: 'test@example.com', phone: '', line1: '123 Test Street', line2: '', city: 'Vancouver', province: 'BC', postalCode: 'V6B 1A1', country: 'CA' };
const update = (patch = {}) => ({ status: 'packed', carrier: '', trackingNumber: '', trackingUrl: '', customer: contact, internalNote: '', version: 0, ...patch });
beforeEach(() => db.exec('TRUNCATE orders, order_fulfillment, order_fulfillment_events, admin_login_limits RESTART IDENTITY CASCADE'));
after(() => db.close());
async function seed(patch = {}) {
  const values = { orderId, provider: 'stripe', paid: 'approved', live: false, account: accountId, ...patch };
  await db.query(`INSERT INTO orders (order_id, validated_cart, total_cents, currency, payment_status, checkout_request_id,
    payment_provider, stripe_account_id, stripe_livemode, paid_total_cents, shipping_cents, tax_cents, customer_email, shipping_details)
    VALUES ($1, '[{"sku":"BRACELET","name":"Test Bracelet","quantity":1,"unitPriceCents":6500}]', 6500, 'CAD', $2, $3, $4, $5, $6, 7500, 1000, 0, 'test@example.com',
    '{"name":"Test Buyer","address":{"line1":"123 Test Street","city":"Vancouver","state":"BC","postal_code":"V6B 1A1","country":"CA"}}')`,
    [values.orderId, values.paid, randomUUID(), values.provider, values.account, values.live]);
  return values.orderId;
}
test('repeatable operational migration leaves all original order columns byte-for-byte unchanged', async () => {
  await seed({ provider: 'godaddy', account: null, live: null });
  const before = (await db.query('SELECT * FROM orders')).rows;
  await db.exec(migration); await db.exec(migration);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, before);
});
test('order views include only paid orders in the pinned account and environment', async () => {
  await seed(); await seed({ orderId: randomUUID(), live: true }); await seed({ orderId: randomUUID(), paid: 'pending' });
  await seed({ orderId: randomUUID(), account: 'acct_other' }); await seed({ orderId: randomUUID(), provider: 'godaddy', account: null, live: null });
  assert.deepEqual((await store.listOrders(scope)).orders.map(o => o.orderId), [orderId]);
  assert.deepEqual(await store.orderCounts(scope), { unfulfilled: 1 });
  assert.equal((await store.listOrders(scope, 'history')).orders.length, 1);
  assert.equal((await store.listOrders(scope, 'all', 'Test Buyer')).orders.length, 1);
  assert.equal((await store.listOrders(scope, 'all', "' OR 1=1--")).orders.length, 0);
});
test('pack, ship and deliver persist tracking with activity while preserving the payment and original customer', async () => {
  await seed(); const original = (await db.query('SELECT * FROM orders')).rows;
  assert.equal(await store.updateFulfillment(orderId, update(), scope), 1);
  const shipped = update({ version: 1, status: 'shipped', carrier: 'Canada Post', trackingNumber: 'TEST123', trackingUrl: 'https://example.com/track/TEST123', customer: { ...contact, line2: 'Suite 2' } });
  assert.equal(await store.updateFulfillment(orderId, shipped, scope), 2);
  assert.equal((await store.getAdminOrder(orderId, scope)).customer.line2, 'Suite 2');
  assert.equal(await store.updateFulfillment(orderId, { ...shipped, version: 2, status: 'delivered' }, scope), 3);
  assert.equal((await store.listOrders(scope, 'delivered', 'TEST123')).orders.length, 1);
  assert.deepEqual((await store.orderEvents(orderId)).map(e => e.status), ['delivered', 'shipped', 'packed']);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, original);
  assert.equal((await store.getAdminOrder(orderId, scope)).originalCustomer.line2, '');
});
test('concurrent saves and retry requests cannot silently overwrite an order or duplicate activity', async () => {
  await seed();
  const results = await Promise.allSettled([store.updateFulfillment(orderId, update(), scope), store.updateFulfillment(orderId, update({ internalNote: 'Another tab' }), scope)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected' && r.reason instanceof OrderConflictError).length, 1);
  assert.equal((await store.orderEvents(orderId)).length, 1);
});
test('unpaid, historical, wrong-account and wrong-mode orders are never writable', async () => {
  for (const patch of [{ paid: 'pending' }, { provider: 'godaddy', account: null, live: null }, { account: 'acct_other' }, { live: true }]) {
    const id = await seed({ orderId: randomUUID(), ...patch });
    await assert.rejects(store.updateFulfillment(id, update(), scope), OrderConflictError);
  }
  assert.equal((await db.query('SELECT * FROM order_fulfillment')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM order_fulfillment_events')).rows.length, 0);
});
test('persistent login throttling survives parallel requests and resets after its window', async () => {
  const result = await Promise.all(Array.from({ length: 23 }, () => store.consumeLoginAttempt()));
  assert.equal(result.filter(Boolean).length, 20);
  await db.exec("UPDATE admin_login_limits SET window_start = now() - interval '16 minutes'");
  assert.equal(await store.consumeLoginAttempt(), true);
});
test('fulfillment validation blocks unsafe links, missing delivery details and untracked shipments without an explanation', () => {
  assert.equal(validateFulfillmentUpdate(update()).status, 'packed');
  for (const patch of [{ trackingUrl: 'javascript:alert(1)' }, { trackingUrl: 'http://example.com' }, { trackingUrl: 'https://user:pass@example.com' },
    { status: 'shipped' }, { version: -1 }, { status: 'paid' }, { customer: { ...contact, email: 'bad' } },
    { customer: { ...contact, country: 'US' } }, { customer: { ...contact, line1: '' } }, { internalNote: 'x'.repeat(2001) }]) {
    assert.throws(() => validateFulfillmentUpdate(update(patch)));
  }
  assert.equal(validateFulfillmentUpdate(update({ status: 'shipped', carrier: 'Canada Post', internalNote: 'Sent by untracked letter mail.' })).status, 'shipped');
});
test('authenticated endpoint saves an order and returns conflicts and validation errors safely', async () => {
  await seed();
  const config = adminConfiguration({ ADMIN_PASSWORD_HASH: await hashAdminPassword('test-only-admin-password'), ADMIN_SESSION_SECRET: 'test-secret-32-characters-long-enough', APP_URL: 'https://shop.example' });
  const deps = { config: () => config, scope: () => scope, ...store };
  const req = body => new Request('https://shop.example/api/admin/orders/' + orderId, { method: 'PATCH',
    headers: { origin: 'https://shop.example', 'content-type': 'application/json', cookie: `${adminCookieName()}=${createAdminSession(config)}` }, body: JSON.stringify(body) });
  const result = await handleOrderUpdate(req(update()), orderId, deps);
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { ok: true, version: 1 });
  assert.equal((await handleOrderUpdate(req(update()), orderId, deps)).status, 409);
  assert.equal((await handleOrderUpdate(req(update({ version: 1, trackingUrl: 'javascript:alert(1)' })), orderId, deps)).status, 400);
});
