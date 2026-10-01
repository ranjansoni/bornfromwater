import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createCatalogStore, CatalogConflictError } from '../src/lib/catalog-store.ts';
import { validateCatalogUpdate } from '../src/lib/catalog-management.ts';
import { handleCatalogUpdate } from '../src/lib/catalog-handler.ts';
import { createOrderStore } from '../src/lib/order-store.ts';
import { validateCart } from '../src/lib/orders.ts';
import { handleCheckout } from '../src/lib/checkout-handler.ts';
import { productJsonLd } from '../src/lib/products.ts';
import { products } from '../src/lib/catalog-seed.ts';
import { adminConfiguration, adminCookieName, createAdminSession, hashAdminPassword } from '../src/lib/admin-auth.ts';
import { config } from './fixtures.mjs';

const db = new PGlite();
await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../src/db/migrations/006-product-catalog.sql', import.meta.url), 'utf8');
const query = { query: async (sql, params) => (await db.query(sql, params)).rows };
const catalog = createCatalogStore(query);
const orders = createOrderStore(query);
const adminConfig = adminConfiguration({ ADMIN_PASSWORD_HASH: await hashAdminPassword('catalogue-test-password-long-enough'),
  ADMIN_SESSION_SECRET: 'catalogue-tests-secret-at-least-32-characters', APP_URL: 'https://shop.example' });
const cookie = `${adminCookieName(adminConfig)}=${createAdminSession(adminConfig)}`;
const original = products[0];
const fields = (p = original, overrides = {}) => ({ name: p.name, price: (p.priceCents / 100).toFixed(2),
  collection: p.collection, stone: p.stone, blurb: p.blurb, description: p.description, meaning: p.meaning,
  storyTitle: p.story?.title ?? '', storyText: p.story?.paragraphs.join('\n\n') ?? '',
  availability: 'active', sortOrder: 0, version: 1, ...overrides });
const request = (value, headers = {}) => new Request('https://shop.example/api/admin/products/new-beginnings', {
  method: 'PATCH', headers: { origin: 'https://shop.example', cookie, 'content-type': 'application/json', ...headers }, body: JSON.stringify(value) });
beforeEach(async () => { await db.exec('TRUNCATE orders, catalog_products CASCADE'); await db.exec(migration); });
after(() => db.close());

test('catalogue seed preserves every product photograph, word, price and identity', async () => {
  const seeded = await catalog.list(true);
  assert.equal(seeded.length, products.length);
  for (const p of products) {
    const row = seeded.find(r => r.slug === p.slug);
    for (const key of ['slug', 'sku', 'name', 'priceCents', 'collection', 'stone', 'blurb', 'description', 'meaning', 'story', 'images', 'placeholder']) {
      assert.deepEqual(row[key], p[key], `${p.slug}: ${key}`);
    }
  }
});
test('repeatable migration preserves owner edits, photos, historical and pending orders', async () => {
  const cart = validateCart([{ slug: original.slug, quantity: 1 }], await catalog.list());
  await orders.createPendingOrder(cart.lines, cart.totalCents, randomUUID(), false, config.accountId);
  await db.query("UPDATE orders SET payment_provider='godaddy', payment_status='approved'");
  const before = (await db.query('SELECT * FROM orders')).rows;
  const edited = await catalog.update(original.slug, validateCatalogUpdate(fields(original, { name: 'Owner wording', price: '72.35', availability: 'disabled' })));
  await db.exec(migration); await db.exec(migration);
  assert.deepEqual(await catalog.get(original.slug), edited);
  assert.deepEqual(edited.images, original.images);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, before);
});
test('disable and coming soon states hide/block new purchases and can be reversed', async () => {
  const items = [{ slug: original.slug, quantity: 1, priceCents: 1 }];
  const disabled = await catalog.update(original.slug, validateCatalogUpdate(fields(original, { availability: 'disabled' })));
  assert.equal((await catalog.list()).some(p => p.slug === original.slug), false);
  assert.throws(() => validateCart(items, [disabled]), /no longer available/);
  const soon = await catalog.update(original.slug, validateCatalogUpdate(fields(original, { version: 2, availability: 'coming-soon' })));
  assert.equal((await catalog.list()).some(p => p.slug === original.slug), true);
  assert.throws(() => validateCart(items, [soon]));
  const active = await catalog.update(original.slug, validateCatalogUpdate(fields(original, { version: 3, price: '72.35' })));
  assert.equal(validateCart(items, [active]).totalCents, 7235);
});
test('concurrent editor saves cannot overwrite one another; only successful changes are audited', async () => {
  const results = await Promise.allSettled([
    catalog.update(original.slug, validateCatalogUpdate(fields(original, { name: 'First save' }))),
    catalog.update(original.slug, validateCatalogUpdate(fields(original, { name: 'Second save' }))),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.ok(results.find(r => r.status === 'rejected').reason instanceof CatalogConflictError);
  const audit = (await db.query('SELECT * FROM catalog_product_events')).rows;
  assert.equal(audit.length, 1);
  assert.equal(audit[0].snapshot.name, (await catalog.get(original.slug)).name);
  assert.equal(audit[0].version, 2);
});
test('product mutations authenticate and check origin before database access', async () => {
  let calls = 0;
  const deps = { config: () => adminConfig, update: async (...args) => { calls++; return catalog.update(...args); } };
  assert.equal((await handleCatalogUpdate(request(fields(), { cookie: '' }), original.slug, deps)).status, 401);
  assert.equal((await handleCatalogUpdate(request(fields(), { origin: 'https://attacker.example' }), original.slug, deps)).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handleCatalogUpdate(request(fields()), original.slug, deps)).status, 200);
  assert.equal((await handleCatalogUpdate(request(fields()), original.slug, deps)).status, 409);
  assert.equal((await handleCatalogUpdate(request(fields(original, { price: '0.01' })), original.slug, deps)).status, 400);
});
test('invalid prices, fields, versions and incomplete stories are rejected', () => {
  for (const patch of [{ price: '65.001' }, { price: '-1' }, { price: 'NaN' }, { price: '1e2' }, { price: '0' },
    { price: '100000.01' }, { price: 65 }, { name: '' }, { name: 'x'.repeat(161) }, { sortOrder: 1.2 },
    { version: 0 }, { collection: 'other' }, { availability: 'unknown' }, { storyTitle: '' }, { storyText: '' }]) {
    assert.throws(() => validateCatalogUpdate(fields(original, patch)));
  }
  assert.equal(validateCatalogUpdate(fields(original, { storyTitle: '', storyText: '' })).story, null);
  assert.equal(validateCatalogUpdate(fields(original, { price: '65.1' })).priceCents, 6510);
});
test('editable strings cannot terminate product JSON-LD or change stable identifiers', async () => {
  const name = '</script><script>alert("x")</script>';
  const result = await catalog.update(original.slug, validateCatalogUpdate(fields(original, { name, sku: 'ATTACK', slug: 'changed' })));
  assert.equal(result.sku, original.sku); assert.equal(result.slug, original.slug);
  const encoded = productJsonLd({ name: result.name });
  assert.equal(encoded.includes('<'), false); assert.equal(JSON.parse(encoded).name, name);
});
test('new checkout uses database pricing and rejects a stale displayed price without inserting an order', async () => {
  await catalog.update(original.slug, validateCatalogUpdate(fields(original, { price: '72.35', name: 'New owner name' })));
  const checkoutId = randomUUID();
  const deps = { ...orders, getCatalog: catalog.list, stripeConfiguration: () => config,
    signingSecret: () => 'unused-in-this-test', checkoutDestination: async () => 'https://checkout.stripe.com/example' };
  const checkoutRequest = (price) => new Request('https://shop.example/api/checkout', { method: 'POST', body: JSON.stringify({ checkoutId,
    items: [{ slug: original.slug, quantity: 1, priceCents: 1 }], expectedPrices: { [original.slug]: price } }) });
  const stale = await handleCheckout(checkoutRequest(6500), deps);
  assert.equal(stale.status, 409); assert.equal((await stale.json()).code, 'CATALOG_CHANGED');
  assert.equal(await orders.getOrderByCheckoutRequest(checkoutId), null);
  assert.equal((await handleCheckout(checkoutRequest(7235), deps)).status, 200);
  const saved = await orders.getOrderByCheckoutRequest(checkoutId);
  assert.equal(saved.totalCents, 7235); assert.equal(saved.validatedCart[0].name, 'New owner name');
  await catalog.update(original.slug, validateCatalogUpdate(fields(original, { version: 2, availability: 'disabled', price: '99' })));
  assert.equal((await handleCheckout(checkoutRequest(1), { ...deps, getCatalog: () => { throw new Error('Existing checkouts must keep their snapshots'); } })).status, 200);
  assert.deepEqual(await orders.getOrderByCheckoutRequest(checkoutId), saved);
  const fresh = new Request('https://shop.example/api/checkout', { method: 'POST', body: JSON.stringify({ checkoutId: randomUUID(), items: [{ slug: original.slug, quantity: 1 }] }) });
  assert.equal((await handleCheckout(fresh, deps)).status, 400);
});
test('catalogue database failure fails closed instead of charging a hardcoded price', async () => {
  let inserted = false;
  const deps = { ...orders, getCatalog: async () => { throw new Error('DB unavailable'); }, stripeConfiguration: () => config,
    signingSecret: () => '', createPendingOrder: async () => { inserted = true; }, checkoutDestination: async () => '' };
  const response = await handleCheckout(new Request('https://shop.example/api/checkout', { method: 'POST', body: JSON.stringify({ checkoutId: randomUUID(), items: [{ slug: original.slug, quantity: 1 }] }) }), deps);
  assert.equal(response.status, 503); assert.equal(inserted, false);
});
