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
import { cardImage, productJsonLd } from '../src/lib/products.ts';
import { products } from '../src/lib/catalog-seed.ts';
import { adminConfiguration, adminCookieName, createAdminSession, hashAdminPassword } from '../src/lib/admin-auth.ts';
import { config, vercelPurchaseEligibility } from './fixtures.mjs';

const db = new PGlite();
await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../src/db/migrations/006-product-catalog.sql', import.meta.url), 'utf8');
const pearlMigration = await readFile(new URL('../src/db/migrations/007-pearl-drift.sql', import.meta.url), 'utf8');
const stillWithinMigration = await readFile(new URL('../src/db/migrations/008-still-within.sql', import.meta.url), 'utf8');
const pearlStoryMigration = await readFile(new URL('../src/db/migrations/009-pearl-drift-story.sql', import.meta.url), 'utf8');
const aquamarineGalleryMigration = await readFile(new URL('../src/db/migrations/010-aquamarine-gallery.sql', import.meta.url), 'utf8');
const amethystGalleryMigration = await readFile(new URL('../src/db/migrations/011-amethyst-gallery.sql', import.meta.url), 'utf8');
const stillWithinGalleryMigration = await readFile(new URL('../src/db/migrations/012-still-within-gallery.sql', import.meta.url), 'utf8');
const stillWithinGiftBoxMigration = await readFile(new URL('../src/db/migrations/013-still-within-gift-box.sql', import.meta.url), 'utf8');
const pearlGalleryMigration = await readFile(new URL('../src/db/migrations/014-pearl-drift-gallery.sql', import.meta.url), 'utf8');
const pearlLeadImageMigration = await readFile(new URL('../src/db/migrations/015-pearl-drift-lead-image.sql', import.meta.url), 'utf8');
const stillWithinLeadImageMigration = await readFile(new URL('../src/db/migrations/016-still-within-lead-image.sql', import.meta.url), 'utf8');
const aquamarineNewImagesMigration = await readFile(new URL('../src/db/migrations/017-aquamarine-new-images.sql', import.meta.url), 'utf8');
const aquamarineMoreImagesMigration = await readFile(new URL('../src/db/migrations/018-aquamarine-more-images.sql', import.meta.url), 'utf8');
const aquamarineWristLeadMigration = await readFile(new URL('../src/db/migrations/019-aquamarine-wrist-lead.sql', import.meta.url), 'utf8');
const pearlBoxMigration = await readFile(new URL('../src/db/migrations/020-pearl-drift-box-image.sql', import.meta.url), 'utf8');
const pureHeartLeadMigration = await readFile(new URL('../src/db/migrations/021-pure-heart-wrist-lead.sql', import.meta.url), 'utf8');
const soleMigration = await readFile(new URL('../src/db/migrations/022-sole.sql', import.meta.url), 'utf8');
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
beforeEach(async () => { await db.exec('TRUNCATE orders, catalog_products CASCADE'); await db.exec(migration); await db.exec(pearlMigration); await db.exec(stillWithinMigration); await db.exec(pearlStoryMigration); await db.exec(aquamarineGalleryMigration); await db.exec(amethystGalleryMigration); await db.exec(stillWithinGalleryMigration); await db.exec(stillWithinGiftBoxMigration); await db.exec(pearlGalleryMigration); await db.exec(pearlLeadImageMigration); await db.exec(stillWithinLeadImageMigration); await db.exec(aquamarineNewImagesMigration); await db.exec(aquamarineMoreImagesMigration); await db.exec(aquamarineWristLeadMigration); await db.exec(pearlBoxMigration); await db.exec(pureHeartLeadMigration); await db.exec(soleMigration); });
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
test('Solé migration creates the purchasable CA$42 listing once and preserves later edits', async () => {
  const expected = products.find(product => product.slug === 'sole');
  const seeded = await catalog.get('sole');
  assert.ok(seeded);
  for (const key of ['slug', 'sku', 'name', 'priceCents', 'collection', 'stone', 'blurb', 'description', 'meaning', 'story', 'images', 'placeholder']) {
    assert.deepEqual(seeded[key], expected[key], `Solé: ${key}`);
  }
  assert.equal(seeded.active, true);
  assert.equal(validateCart([{ slug: 'sole', size: 'medium', quantity: 1 }], await catalog.list()).totalCents, 4200);
  const edited = await catalog.update('sole', validateCatalogUpdate(fields(expected, { name: 'Owner edited Solé', sortOrder: seeded.sortOrder, version: seeded.version })));
  await db.exec(soleMigration);
  assert.deepEqual(await catalog.get('sole'), edited);
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM catalog_products WHERE slug='sole'")).rows[0].count, 1);
});
test('Pearl Drift is purchasable for CA$62 and its migration preserves owner edits', async () => {
  const pearl = await catalog.get('pearl-drift');
  assert.equal(pearl.priceCents, 6200);
  assert.equal(pearl.collection, 'tide');
  assert.equal(pearl.images.length, 11);
  assert.equal(pearl.images[0].src, '/products/pearl-drift/06.png');
  assert.equal(pearl.images[0].kind, 'photo');
  assert.equal(cardImage(pearl)?.src, pearl.images[0].src);
  assert.equal(pearl.images[1].src, '/products/pearl-drift/01.jpg');
  assert.deepEqual(pearl.images.slice(4, 7).map(image => image.src), [
    '/products/pearl-drift/plaster-hand-01.png',
    '/products/pearl-drift/plaster-hand-02.png',
    '/products/pearl-drift/plaster-hand-03.png',
  ]);
  assert.equal(pearl.images[7].src, '/products/pearl-drift/05.png');
  assert.equal(pearl.images[10].src, '/products/pearl-drift/img-9251.jpeg');
  assert.equal(pearl.story.title, 'Pearl Drift');
  assert.equal(pearl.story.paragraphs.length, 5);
  assert.equal(validateCart([{ slug: pearl.slug, quantity: 1 }], await catalog.list()).totalCents, 6200);
  await db.query("UPDATE catalog_products SET name = 'Owner wording' WHERE slug = 'pearl-drift'");
  await db.exec(pearlMigration);
  await db.exec(pearlGalleryMigration);
  await db.exec(pearlLeadImageMigration);
  await db.exec(pearlBoxMigration);
  assert.equal((await catalog.get('pearl-drift')).name, 'Owner wording');
  assert.equal((await catalog.get('pearl-drift')).version, pearl.version);
});
test('Pearl Drift box image appears on an older gallery and migrates once', async () => {
  const pearl = await catalog.get('pearl-drift');
  await db.query("UPDATE catalog_products SET images = $1::jsonb WHERE slug = 'pearl-drift'", [JSON.stringify(pearl.images.slice(0, 10))]);
  assert.deepEqual((await catalog.get('pearl-drift')).images, pearl.images);
  await db.exec(pearlBoxMigration);
  const persisted = await db.query("SELECT images, version FROM catalog_products WHERE slug = 'pearl-drift'");
  assert.deepEqual(persisted.rows[0].images, pearl.images);
  await db.exec(pearlBoxMigration);
  const unchanged = await db.query("SELECT version FROM catalog_products WHERE slug = 'pearl-drift'");
  assert.equal(unchanged.rows[0].version, persisted.rows[0].version);
});
test('Pearl Drift story migration leaves an owner-edited story unchanged', async () => {
  await db.query("UPDATE catalog_products SET story = '{\"title\":\"Owner story\",\"paragraphs\":[\"Personal copy\"]}'::jsonb WHERE slug = 'pearl-drift'");
  await db.exec(pearlStoryMigration);
  assert.equal((await catalog.get('pearl-drift')).story.title, 'Owner story');
});
test('Pure Heart removes its old first and fifth photos and leads with the new wrist image', async () => {
  const expected = products.find(product => product.slug === 'pure-heart');
  const before = [
    { src: '/products/pure-heart/01.jpg', kind: 'photo' },
    ...expected.images.slice(1, 4),
    { src: '/products/pure-heart/05.jpg', kind: 'photo' },
    ...expected.images.slice(4),
  ];
  await db.query("UPDATE catalog_products SET images = $1::jsonb WHERE slug = 'pure-heart'", [JSON.stringify(before)]);
  const projected = await catalog.get('pure-heart');
  assert.deepEqual(projected.images, expected.images);
  assert.equal(cardImage(projected)?.src, '/products/pure-heart/wrist-lotus.png');
  await db.exec(pureHeartLeadMigration);
  const persisted = await db.query("SELECT images, version FROM catalog_products WHERE slug = 'pure-heart'");
  assert.deepEqual(persisted.rows[0].images, expected.images);
  await db.exec(pureHeartLeadMigration);
  const unchanged = await db.query("SELECT version FROM catalog_products WHERE slug = 'pure-heart'");
  assert.equal(unchanged.rows[0].version, persisted.rows[0].version);
});
test('Still Within is purchasable for CA$52 and its migration preserves owner edits', async () => {
  const product = await catalog.get('still-within');
  assert.equal(product.priceCents, 5200);
  assert.equal(product.collection, 'tide');
  assert.equal(product.images.length, 9);
  assert.equal(product.images[0].src, '/products/still-within/05-updated.webp');
  assert.equal(cardImage(product)?.src, product.images[0].src);
  assert.equal(product.images[1].src, '/products/still-within/01.webp');
  assert.equal(product.images[3].src, '/products/still-within/03-updated.webp');
  assert.equal(product.images[4].src, '/products/still-within/closeup-01.jpeg');
  assert.equal(product.images[5].src, '/products/still-within/closeup-02.jpeg');
  assert.equal(product.images[6].src, '/products/still-within/ceramic-hand-01.png');
  assert.equal(product.images[7].src, '/products/still-within/ceramic-hand-02.png');
  assert.equal(product.images[8].src, '/products/still-within/gift-box.png');
  assert.equal(product.story.title, 'STILL WITHIN 🐚');
  assert.equal(validateCart([{ slug: product.slug, quantity: 1 }], await catalog.list()).totalCents, 5200);
  await db.query("UPDATE catalog_products SET name = 'Owner wording' WHERE slug = 'still-within'");
  await db.exec(stillWithinMigration);
  assert.equal((await catalog.get('still-within')).name, 'Owner wording');
  await db.exec(stillWithinGalleryMigration);
  await db.exec(stillWithinGiftBoxMigration);
  await db.exec(stillWithinLeadImageMigration);
  assert.equal((await catalog.get('still-within')).version, product.version);
});
test('Aquamarine Tide gallery removes duplicates, adds five photos, and leads with the wrist shot', async () => {
  const product = await catalog.get('aquamarine-tide');
  assert.deepEqual(product.images.map(image => image.src),
    [
      '/products/aquamarine-tide/img-8638.jpeg',
      '/products/aquamarine-tide/img-8637.jpeg',
      '/products/aquamarine-tide/06.jpg',
      '/products/aquamarine-tide/img-8991.jpeg',
      '/products/aquamarine-tide/04.jpg',
      '/products/aquamarine-tide/08.jpg',
      '/products/aquamarine-tide/img-8631.jpeg',
      '/products/aquamarine-tide/11.jpg',
      '/products/aquamarine-tide/01.jpg',
      '/products/aquamarine-tide/07.jpg',
      '/products/aquamarine-tide/03.jpg',
      '/products/aquamarine-tide/flatlay-03.png',
    ]);
  assert.equal(product.priceCents, 4900);
  assert.equal(cardImage(product)?.src, product.images[0].src);
  await db.exec(aquamarineGalleryMigration);
  await db.exec(aquamarineNewImagesMigration);
  await db.exec(aquamarineMoreImagesMigration);
  await db.exec(aquamarineWristLeadMigration);
  assert.equal((await catalog.get('aquamarine-tide')).version, product.version);
  const sourcesBeforeLead = [
    ...[1, 3, 4, 6, 7, 8, 10, 11].map(n => `/products/aquamarine-tide/${String(n).padStart(2, '0')}.jpg`),
    '/products/aquamarine-tide/img-8637.jpeg',
    '/products/aquamarine-tide/img-8638.jpeg',
    '/products/aquamarine-tide/flatlay-03.png',
    '/products/aquamarine-tide/img-8991.jpeg',
    '/products/aquamarine-tide/img-8631.jpeg',
  ];
  const beforeLead = sourcesBeforeLead.map(src => product.images.find(image => image.src === src) ?? { src, kind: 'photo' });
  for (const [gallery, pendingMigrations] of [
    [beforeLead, [aquamarineWristLeadMigration]],
    [beforeLead.slice(0, 11), [aquamarineMoreImagesMigration, aquamarineWristLeadMigration]],
    [beforeLead.slice(0, 8), [aquamarineNewImagesMigration, aquamarineMoreImagesMigration, aquamarineWristLeadMigration]],
  ]) {
    await db.query("UPDATE catalog_products SET images = $1::jsonb WHERE slug = 'aquamarine-tide'", [JSON.stringify(gallery)]);
    assert.deepEqual((await catalog.get('aquamarine-tide')).images, product.images);
    for (const pendingMigration of pendingMigrations) await db.exec(pendingMigration);
    const persisted = await db.query("SELECT images FROM catalog_products WHERE slug = 'aquamarine-tide'");
    assert.deepEqual(persisted.rows[0].images, product.images);
  }
});
test('Amethyst Tide gallery removes only the 11th image', async () => {
  const product = await catalog.get('amethyst-tide');
  assert.deepEqual(product.images.map(image => image.src),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16]
      .map(n => `/products/amethyst-tide/${String(n).padStart(2, '0')}.jpg`));
  assert.equal(product.priceCents, 4900);
  await db.exec(amethystGalleryMigration);
  assert.equal((await catalog.get('amethyst-tide')).version, product.version);
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
  const deps = { ...orders, purchaseEligibility: vercelPurchaseEligibility, getCatalog: catalog.list, stripeConfiguration: () => config,
    signingSecret: () => 'unused-in-this-test', checkoutDestination: async () => 'https://checkout.stripe.com/example' };
  const checkoutRequest = (price) => new Request('https://shop.example/api/checkout', { method: 'POST', headers: { 'x-vercel-ip-country': 'CA' }, body: JSON.stringify({ checkoutId,
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
  const fresh = new Request('https://shop.example/api/checkout', { method: 'POST', headers: { 'x-vercel-ip-country': 'CA' }, body: JSON.stringify({ checkoutId: randomUUID(), items: [{ slug: original.slug, quantity: 1 }] }) });
  assert.equal((await handleCheckout(fresh, deps)).status, 400);
});
test('catalogue database failure fails closed instead of charging a hardcoded price', async () => {
  let inserted = false;
  const deps = { ...orders, purchaseEligibility: vercelPurchaseEligibility, getCatalog: async () => { throw new Error('DB unavailable'); }, stripeConfiguration: () => config,
    signingSecret: () => '', createPendingOrder: async () => { inserted = true; }, checkoutDestination: async () => '' };
  const response = await handleCheckout(new Request('https://shop.example/api/checkout', { method: 'POST', headers: { 'x-vercel-ip-country': 'CA' }, body: JSON.stringify({ checkoutId: randomUUID(), items: [{ slug: original.slug, quantity: 1 }] }) }), deps);
  assert.equal(response.status, 503); assert.equal(inserted, false);
});
