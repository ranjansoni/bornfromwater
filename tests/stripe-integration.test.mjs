import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createOrderStore } from '../src/lib/order-store.ts';
import { checkoutDestination, CheckoutExpiredError } from '../src/lib/stripe-checkout.ts';
import { handleCheckout } from '../src/lib/checkout-handler.ts';
import { handleStripeWebhook } from '../src/lib/stripe-webhook.ts';
import { validateCart, verifyOrderToken } from '../src/lib/orders.ts';
import { products } from '../src/lib/products.ts';
import { checkoutId, accountId, config, sdk, secret, session, webhookRequest } from './fixtures.mjs';
import { POST as retiredCharge } from '../src/app/api/checkout/charge/route.ts';

process.env.ORDER_SIGNING_SECRET = 'test-only-signing-secret-at-least-32-characters';
const db = new PGlite();
await db.exec(await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
const store = createOrderStore({ query: async (sql, params) => (await db.query(sql, params)).rows });
const product = products.find(p => !p.placeholder);
const items = [{ slug: product.slug, quantity: 1 }];
const cart = validateCart(items);
beforeEach(() => db.exec('TRUNCATE orders'));
after(() => db.close());

function harness() {
  const sessions = new Map(); const requests = []; let current;
  const stripe = { webhooks: sdk.webhooks, accounts: { retrieveCurrent: async () => ({ id: accountId }) },
    checkout: { sessions: {
      create: async (params, options) => {
        requests.push(structuredClone({ params, options }));
        if (!sessions.has(options.idempotencyKey)) {
          const total = params.line_items.reduce((sum, line) => sum + line.quantity * line.price_data.unit_amount, 0);
          current = session({ client_reference_id: params.client_reference_id, metadata: params.metadata,
            amount_subtotal: total, amount_total: total + config.shippingCents, status: 'open', payment_status: 'unpaid' });
          sessions.set(options.idempotencyKey, current);
        }
        return sessions.get(options.idempotencyKey);
      },
      retrieve: async () => current,
    } } };
  const deps = { ...store, stripeClient: () => stripe, stripeConfiguration: () => config, webhookSecret: () => secret };
  const checkoutDeps = { ...deps, signingSecret: () => process.env.ORDER_SIGNING_SECRET,
    checkoutDestination: order => checkoutDestination(order, deps) };
  return { deps, checkoutDeps, stripe, requests, get current() { return current; }, set current(v) { current = v; } };
}
const request = (body = { items, checkoutId }) => new Request('http://localhost/api/checkout', { method: 'POST', body: JSON.stringify(body) });
async function pending() { return store.createPendingOrder(cart.lines, cart.totalCents, checkoutId, false, accountId); }
async function started(h) {
  const initial = await pending(); await checkoutDestination(initial, h.deps); return store.getOrder(initial.orderId);
}

test('concurrent requests create one order and reuse frozen Session parameters', async () => {
  const h = harness();
  const responses = await Promise.all(Array.from({ length: 8 }, () => handleCheckout(request(), h.checkoutDeps)));
  assert.ok(responses.every(r => r.status === 200));
  assert.equal((await db.query('SELECT * FROM orders')).rows.length, 1);
  assert.ok(h.requests.length >= 1);
  for (const call of h.requests) assert.deepEqual(call, h.requests[0]);
  assert.equal(h.requests[0].params.line_items[0].price_data.unit_amount, product.priceCents);
  assert.equal(h.requests[0].params.adaptive_pricing.enabled, false);
  assert.equal(h.requests[0].params.ui_mode, 'hosted_page');
  assert.match(h.requests[0].params.integration_identifier, /^bornfromwater_hosted_[a-z]{8}$/);
  assert.equal(h.requests[0].params.billing_address_collection, 'required');
  const persisted = await store.getOrderByCheckoutRequest(checkoutId);
  assert.equal(persisted.stripeSessionId, h.current.id);
  assert.equal(persisted.stripeAccountId, accountId);
});
test('catalogue and configuration changes cannot reprice an existing checkout', async () => {
  const h = harness(); const initial = await started(h);
  const response = await handleCheckout(request({ checkoutId, items: [{ slug: 'removed-product', quantity: 999, priceCents: 1 }] }), h.checkoutDeps);
  assert.equal(response.status, 200); assert.equal(h.requests.length, 1);
  assert.equal((await store.getOrder(initial.orderId)).totalCents, cart.totalCents);
  const saved = await store.saveCheckoutParams(initial.orderId, { mode: 'subscription' });
  assert.deepEqual(saved, initial.stripeCheckoutParams);
});
test('lost Stripe response retries the same idempotency key without another payment', async () => {
  const h = harness(); const initial = await pending(); const create = h.stripe.checkout.sessions.create; let first = true;
  h.stripe.checkout.sessions.create = async (...args) => { const result = await create(...args); if (first) { first = false; throw new Error('Timeout'); } return result; };
  assert.equal((await handleCheckout(request(), h.checkoutDeps)).status, 503);
  assert.equal((await store.getOrder(initial.orderId)).stripeSessionId, null);
  assert.equal((await handleCheckout(request(), h.checkoutDeps)).status, 200);
  assert.deepEqual(h.requests[0], h.requests[1]);
});
test('failure to associate the Session can be safely retried', async () => {
  const h = harness(); const initial = await pending(); let first = true;
  h.deps.attachCheckoutSession = async (...args) => { if (first) { first = false; throw new Error('DB down'); } return store.attachCheckoutSession(...args); };
  await assert.rejects(checkoutDestination(initial, h.deps));
  await checkoutDestination(await store.getOrder(initial.orderId), h.deps);
  assert.deepEqual(h.requests[0], h.requests[1]);
  await assert.rejects(store.attachCheckoutSession(initial.orderId, 'cs_other'));
});
test('old ambiguous attempt requires reconciliation; only confirmed expiry allows reset', async () => {
  const h = harness(); const initial = await pending();
  await db.query("UPDATE orders SET created_at = now() - interval '25 hours' WHERE order_id = $1", [initial.orderId]);
  const response = await handleCheckout(request(), h.checkoutDeps); assert.equal(response.status, 503);
  assert.equal((await response.json()).code, undefined); assert.equal(h.requests.length, 0);
  await db.query('UPDATE orders SET created_at = now() WHERE order_id = $1', [initial.orderId]);
  const active = await started(h); h.current = { ...h.current, status: 'expired' };
  await assert.rejects(checkoutDestination(active, h.deps), CheckoutExpiredError);
  const ended = await handleCheckout(request(), h.checkoutDeps);
  assert.equal(ended.status, 409); assert.equal((await ended.json()).code, 'CHECKOUT_ENDED');
});
test('cancelled open Session is reused; account switches are rejected', async () => {
  const h = harness(); const active = await started(h);
  assert.match(await checkoutDestination(active, h.deps), /^https:\/\/checkout.stripe.com/); assert.equal(h.requests.length, 1);
  await assert.rejects(checkoutDestination({ ...active, stripeAccountId: 'acct_other' }, h.deps));
  h.stripe.accounts.retrieveCurrent = async () => ({ id: 'acct_other' });
  await assert.rejects(checkoutDestination(active, h.deps));
});
test('unpaid completed event stays processing; signed success stores actual total and delivery details', async () => {
  const h = harness(); const active = await started(h); h.current = { ...h.current, status: 'complete' };
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current), h.deps)).status, 200);
  assert.equal((await store.getOrder(active.orderId)).paymentStatus, 'processing');
  assert.match(await checkoutDestination(await store.getOrder(active.orderId), h.deps), /^\/checkout\/status\?token=/);
  h.current = { ...h.current, payment_status: 'paid' };
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.async_payment_succeeded', h.current), h.deps)).status, 200);
  const saved = await store.getOrder(active.orderId); assert.equal(saved.paymentStatus, 'approved');
  assert.equal(saved.paidTotalCents, cart.totalCents + config.shippingCents);
  const row = (await db.query('SELECT * FROM orders')).rows[0];
  assert.equal(row.customer_email, 'buyer@example.com'); assert.equal(row.shipping_details.address.country, 'CA'); assert.equal(row.order_note, '6 inches');
});
test('duplicates and late failures or expirations cannot downgrade approved orders', async () => {
  const h = harness(); const active = await started(h); h.current = { ...h.current, status: 'complete', payment_status: 'paid' };
  for (let i = 0; i < 2; i++) assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current), h.deps)).status, 200);
  const paid = structuredClone(h.current);
  for (const type of ['checkout.session.expired', 'checkout.session.async_payment_failed']) {
    const stale = { ...paid, status: type.endsWith('expired') ? 'expired' : 'complete', payment_status: 'unpaid' };
    assert.equal((await handleStripeWebhook(webhookRequest(type, stale), h.deps)).status, 200);
  }
  await store.recordStripeStatus(active.orderId, h.current.id, 'declined');
  await store.recordStripeStatus(active.orderId, h.current.id, 'expired');
  assert.equal((await store.getOrder(active.orderId)).paymentStatus, 'approved');
});
test('async failure stays declined when an old unpaid completion arrives later', async () => {
  const h = harness(); const active = await started(h); h.current = { ...h.current, status: 'complete' };
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.async_payment_failed', h.current), h.deps)).status, 200);
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current), h.deps)).status, 200);
  assert.equal((await store.getOrder(active.orderId)).paymentStatus, 'declined');
});
test('invalid signature, mismatched order, amount, account and mode never approve', async () => {
  const h = harness(); const active = await started(h); h.current = { ...h.current, status: 'complete', payment_status: 'paid' };
  assert.equal((await handleStripeWebhook(new Request('http://localhost/webhook', { method: 'POST', body: '{}' }), h.deps)).status, 400);
  for (const patch of [{ amount_subtotal: 1 }, { currency: 'usd' }, { livemode: true }, { metadata: { ...h.current.metadata, checkout_request_id: 'other' } }, { id: 'cs_other' }]) {
    assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', { ...h.current, ...patch }), h.deps)).status, 400);
  }
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current, { livemode: true }), h.deps)).status, 400);
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current, { account: 'acct_other' }), h.deps)).status, 400);
  assert.equal((await store.getOrder(active.orderId)).paymentStatus, 'pending');
});
test('missing association and transient DB failures request webhook retries; unrelated events are ignored', async () => {
  const h = harness(); const active = await started(h);
  await db.query('UPDATE orders SET stripe_session_id = NULL WHERE order_id = $1', [active.orderId]);
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current), h.deps)).status, 503);
  await store.attachCheckoutSession(active.orderId, h.current.id);
  h.current = { ...h.current, status: 'complete', payment_status: 'paid' };
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', h.current), { ...h.deps, recordStripePayment: async () => { throw new Error('DB unavailable'); } })).status, 503);
  assert.equal((await handleStripeWebhook(webhookRequest('checkout.session.completed', { ...h.current, metadata: {} }), h.deps)).status, 200);
  assert.equal((await handleStripeWebhook(webhookRequest('customer.created', {}), h.deps)).status, 200);
});
test('historical orders retain their status and never create Stripe Sessions', async () => {
  const h = harness(); const active = await pending();
  await db.query("UPDATE orders SET payment_provider = 'godaddy', godaddy_transaction_id = 'legacy-tx', payment_status = 'approved', stripe_livemode = NULL, stripe_account_id = NULL WHERE order_id = $1", [active.orderId]);
  for (const state of ['approved', 'processing', 'pending', 'declined']) {
    await db.query('UPDATE orders SET payment_status = $1 WHERE order_id = $2', [state, active.orderId]);
    const response = await handleCheckout(request(), { ...h.checkoutDeps, stripeConfiguration: () => { throw new Error('Must not contact Stripe'); } });
    assert.equal(response.status, 200);
    const { paymentPath } = await response.json();
    assert.equal(verifyOrderToken(new URL(paymentPath, config.origin).searchParams.get('token')).orderId, active.orderId);
    assert.equal((await store.getOrder(active.orderId)).paymentStatus, state);
  }
  assert.equal(h.requests.length, 0); assert.equal(retiredCharge().status, 410);
});
test('invalid payload and unavailable configuration fail safely without inserting an order', async () => {
  const h = harness();
  for (const body of [null, {}, { checkoutId: 'not-a-uuid' }]) assert.equal((await handleCheckout(request(body), h.checkoutDeps)).status, 400);
  assert.equal((await handleCheckout(request({ checkoutId, items: [] }), h.checkoutDeps)).status, 400);
  const response = await handleCheckout(request(), { ...h.checkoutDeps, stripeConfiguration: () => { throw new Error('sk_test_should_not_leak'); } });
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /sk_test/);
  assert.equal((await db.query('SELECT * FROM orders')).rows.length, 0);
});
