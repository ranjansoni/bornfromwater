import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createAdminOrderStore, OrderConflictError } from '../src/lib/admin-order-store.ts';
import { validateFulfillmentUpdate } from '../src/lib/order-management.ts';
import { handleOrderUpdate, handleOrderDeletion } from '../src/lib/admin-handlers.ts';
import { adminConfiguration, createAdminSession, adminCookieName, hashAdminPassword } from '../src/lib/admin-auth.ts';
import { orderId, accountId } from './fixtures.mjs';

const db = new PGlite();
await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../src/db/migrations/002-order-management.sql', import.meta.url), 'utf8');
await db.exec(migration);
const cancellationMigration = await readFile(new URL('../src/db/migrations/003-order-cancellation.sql', import.meta.url), 'utf8');
await db.exec(cancellationMigration);
const deletionMigration = await readFile(new URL('../src/db/migrations/005-order-soft-delete.sql', import.meta.url), 'utf8');
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
test('cancellation migration upgrades the previous schema without changing orders or operational history', async () => {
  const previous = new PGlite();
  try {
    await previous.exec('CREATE TABLE orders (order_id uuid PRIMARY KEY, payment_status text NOT NULL)');
    await previous.exec(migration);
    await previous.query("INSERT INTO orders VALUES ($1, 'approved')", [orderId]);
    await previous.query("INSERT INTO order_fulfillment (order_id, status, internal_note) VALUES ($1, 'packed', 'Keep existing note')", [orderId]);
    await previous.query("INSERT INTO order_fulfillment_events (order_id, status, carrier, tracking_number) VALUES ($1, 'packed', '', '')", [orderId]);
    const ordersBefore = (await previous.query('SELECT * FROM orders')).rows;
    const fulfillmentBefore = (await previous.query('SELECT * FROM order_fulfillment')).rows;
    const eventsBefore = (await previous.query('SELECT * FROM order_fulfillment_events')).rows;
    await previous.exec(cancellationMigration); await previous.exec(cancellationMigration);
    assert.deepEqual((await previous.query('SELECT * FROM orders')).rows, ordersBefore);
    assert.deepEqual((await previous.query('SELECT * FROM order_fulfillment')).rows, fulfillmentBefore);
    assert.deepEqual((await previous.query('SELECT * FROM order_fulfillment_events')).rows, eventsBefore.map(e => ({ ...e, internal_note: '' })));
    await previous.query("UPDATE order_fulfillment SET status = 'cancelled' WHERE order_id = $1", [orderId]);
    await assert.rejects(previous.query("UPDATE order_fulfillment SET status = 'invalid' WHERE order_id = $1", [orderId]));
  } finally { await previous.close(); }
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
test('cancellation leaves payment intact, removes the order from active queues and preserves its reason after reopening', async () => {
  await seed(); const original = (await db.query('SELECT * FROM orders')).rows;
  await store.updateFulfillment(orderId, update(), scope);
  const cancelled = validateFulfillmentUpdate(update({ version: 1, status: 'cancelled', internalNote: 'Customer requested cancellation. Refund handled in Stripe.' }));
  assert.equal(await store.updateFulfillment(orderId, cancelled, scope), 2);
  for (const status of ['unfulfilled', 'packed', 'shipped', 'delivered']) assert.equal((await store.listOrders(scope, status)).orders.length, 0);
  assert.deepEqual(await store.orderCounts(scope), { cancelled: 1 });
  assert.equal((await store.listOrders(scope, 'cancelled')).orders[0].orderId, orderId);
  assert.equal((await store.listOrders(scope, 'all')).orders.length, 1);
  await assert.rejects(store.updateFulfillment(orderId, update({ version: 1, status: 'shipped' }), scope), OrderConflictError);
  await store.updateFulfillment(orderId, update({ version: 2, status: 'unfulfilled', internalNote: 'Reopened for a test.' }), scope);
  const events = await store.orderEvents(orderId);
  assert.deepEqual(events.map(e => e.status), ['unfulfilled', 'cancelled', 'packed']);
  assert.equal(events[1].internalNote, cancelled.internalNote);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, original);
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
test('cancellation requires a reason and does not imply a refund', () => {
  for (const internalNote of ['', '   ']) assert.throws(() => validateFulfillmentUpdate(update({ status: 'cancelled', internalNote })), /cancellation reason/);
  assert.equal(validateFulfillmentUpdate(update({ status: 'cancelled', internalNote: 'Customer no longer needs it.' })).status, 'cancelled');
  assert.throws(() => validateFulfillmentUpdate(update({ status: 'refunded', internalNote: 'Not a fulfillment status.' })));
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
  assert.equal((await handleOrderUpdate(req(update({ version: 1, status: 'cancelled' })), orderId, deps)).status, 400);
  assert.equal((await handleOrderUpdate(req(update({ version: 1, status: 'cancelled', internalNote: 'Requested by customer.' })), orderId, deps)).status, 200);
  assert.equal((await store.getAdminOrder(orderId, scope)).status, 'cancelled');
});

test('soft-delete migration upgrades existing operational records repeatably without changing their fields', async () => {
  const previous = new PGlite();
  try {
    await previous.exec('CREATE TABLE orders (order_id uuid PRIMARY KEY, payment_status text NOT NULL)');
    await previous.exec(migration); await previous.exec(cancellationMigration);
    await previous.query("INSERT INTO orders VALUES ($1, 'approved')", [orderId]);
    await previous.query("INSERT INTO order_fulfillment (order_id, status, internal_note) VALUES ($1, 'cancelled', 'Keep this reason')", [orderId]);
    await previous.query("INSERT INTO order_fulfillment_events (order_id, status, carrier, tracking_number, internal_note) VALUES ($1, 'cancelled', '', '', 'Keep this reason')", [orderId]);
    const original = (await previous.query('SELECT * FROM orders')).rows;
    const fulfillment = (await previous.query('SELECT * FROM order_fulfillment')).rows;
    const events = (await previous.query('SELECT * FROM order_fulfillment_events')).rows;
    await previous.exec(deletionMigration); await previous.exec(deletionMigration);
    assert.deepEqual((await previous.query('SELECT * FROM orders')).rows, original);
    assert.deepEqual((await previous.query('SELECT * FROM order_fulfillment')).rows, fulfillment.map(row => ({ ...row, deleted_at: null })));
    assert.deepEqual((await previous.query('SELECT * FROM order_fulfillment_events')).rows, events.map(row => ({ ...row, action: 'updated' })));
  } finally { await previous.close(); }
});

test('soft deletion hides orders and counts, preserves search and fulfillment details, and restores without touching payments', async () => {
  await seed(); const original = (await db.query('SELECT * FROM orders')).rows;
  const shipped = update({ status: 'shipped', carrier: 'Canada Post', trackingNumber: 'TRACK123', internalNote: 'Keep this note', customer: { ...contact, line2: 'Suite 2' } });
  await store.updateFulfillment(orderId, shipped, scope);
  assert.equal(await store.setOrderDeleted(orderId, true, 1, scope), 2);
  assert.equal((await store.listOrders(scope, 'all')).orders.length, 0);
  assert.equal((await store.listOrders(scope, 'shipped')).orders.length, 0);
  assert.deepEqual(await store.orderCounts(scope), {});
  assert.deepEqual(await store.orderCounts(scope, true), { shipped: 1 });
  const visible = (await store.listOrders(scope, 'shipped', 'TRACK123', 1, true)).orders;
  assert.equal(visible.length, 1); assert.ok(visible[0].deletedAt);
  assert.equal(visible[0].status, 'shipped'); assert.equal(visible[0].customer.line2, 'Suite 2');
  assert.equal((await store.listOrders(scope, 'all', 'no match', 1, true)).orders.length, 0);
  await assert.rejects(store.updateFulfillment(orderId, { ...shipped, version: 2 }, scope), OrderConflictError);
  assert.equal(await store.setOrderDeleted(orderId, false, 2, scope), 3);
  const restored = (await store.getAdminOrder(orderId, scope));
  assert.equal(restored.deletedAt, null); assert.equal(restored.status, 'shipped');
  assert.equal(restored.carrier, shipped.carrier); assert.equal(restored.internalNote, shipped.internalNote);
  assert.equal((await store.listOrders(scope, 'shipped')).orders.length, 1);
  assert.deepEqual((await store.orderEvents(orderId)).map(e => e.action), ['restored', 'deleted', 'updated']);
  assert.deepEqual((await db.query('SELECT * FROM orders')).rows, original);
});

test('deleting an untouched order and concurrent delete, restore or fulfillment requests are version protected', async () => {
  await seed();
  await assert.rejects(store.setOrderDeleted(orderId, false, 0, scope), OrderConflictError);
  const results = await Promise.allSettled([store.setOrderDeleted(orderId, true, 0, scope), store.setOrderDeleted(orderId, true, 0, scope)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await store.orderEvents(orderId)).length, 1);
  await assert.rejects(store.setOrderDeleted(orderId, true, 1, scope), OrderConflictError);
  await assert.rejects(store.setOrderDeleted(orderId, false, 0, scope), OrderConflictError);
  await assert.rejects(store.updateFulfillment(orderId, update(), scope), OrderConflictError);
  await store.setOrderDeleted(orderId, false, 1, scope);
  const edits = await Promise.allSettled([store.updateFulfillment(orderId, update({ version: 2 }), scope), store.setOrderDeleted(orderId, true, 2, scope)]);
  assert.equal(edits.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(edits.filter(r => r.status === 'rejected' && r.reason instanceof OrderConflictError).length, 1);
  assert.equal((await store.orderEvents(orderId)).length, 3);
});

test('soft deletion and restore cannot mutate historical, unpaid, missing, or differently scoped orders', async () => {
  await assert.rejects(store.setOrderDeleted(randomUUID(), true, 0, scope), OrderConflictError);
  for (const patch of [{ paid: 'pending' }, { provider: 'godaddy', account: null, live: null }, { account: 'acct_other' }, { live: true }]) {
    const id = await seed({ orderId: randomUUID(), ...patch });
    await assert.rejects(store.setOrderDeleted(id, true, 0, scope), OrderConflictError);
    await assert.rejects(store.setOrderDeleted(id, false, 0, scope), OrderConflictError);
  }
  assert.equal((await db.query('SELECT * FROM order_fulfillment')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM order_fulfillment_events')).rows.length, 0);
});

test('deleted-order filtering paginates after excluding deleted rows', async () => {
  const ids = await Promise.all(Array.from({ length: 52 }, () => seed({ orderId: randomUUID() })));
  await store.setOrderDeleted(ids[0], true, 0, scope); await store.setOrderDeleted(ids[1], true, 0, scope);
  assert.equal((await store.listOrders(scope, 'all')).hasMore, false);
  assert.equal((await store.listOrders(scope, 'all', '', 1, true)).hasMore, true);
  assert.equal((await store.listOrders(scope, 'all', '', 2, true)).orders.length, 2);
});

test('authenticated soft deletion validates input and returns replay conflicts and generic failures', async () => {
  await seed();
  const config = adminConfiguration({ ADMIN_PASSWORD_HASH: await hashAdminPassword('test-only-admin-password'), ADMIN_SESSION_SECRET: 'test-secret-32-characters-long-enough', APP_URL: 'https://shop.example' });
  const deps = { config: () => config, scope: () => scope, ...store };
  const req = body => new Request('https://shop.example/api/admin/orders/' + orderId + '/visibility', { method: 'PATCH',
    headers: { origin: 'https://shop.example', 'content-type': 'application/json', cookie: `${adminCookieName()}=${createAdminSession(config)}` }, body: JSON.stringify(body) });
  for (const body of [null, {}, { deleted: 'true', version: 0 }, { deleted: true, version: -1 }, { deleted: true, version: 1.5 }]) {
    assert.equal((await handleOrderDeletion(req(body), orderId, deps)).status, 400);
  }
  const result = await handleOrderDeletion(req({ deleted: true, version: 0 }), orderId, deps);
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { ok: true, version: 1 });
  assert.match(result.headers.get('cache-control'), /no-store/);
  assert.equal((await handleOrderDeletion(req({ deleted: true, version: 0 }), orderId, deps)).status, 409);
  assert.equal((await handleOrderDeletion(req({ deleted: false, version: 1 }), orderId, deps)).status, 200);
  const failed = await handleOrderDeletion(req({ deleted: true, version: 2 }), orderId, { ...deps, setOrderDeleted: async () => { throw new Error('private database error'); } });
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /private database error/);
});
