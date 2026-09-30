import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreateSession, verifiedPayment, verifyCheckoutSession, InvalidCheckoutSessionError } from '../src/lib/checkout-service.ts';
import { order, session } from './fixtures.mjs';

test('verifies paid totals, delivery details and sizing note', () => {
  assert.deepEqual(verifiedPayment(order(), session()), { paymentIntentId: 'pi_one', paidTotalCents: 7000, shippingCents: 500, taxCents: 0, customerEmail: 'buyer@example.com', shippingDetails: session().collected_information.shipping_details, orderNote: '6 inches' });
});
for (const patch of [{ status: 'open' }, { status: 'expired' }, { payment_status: 'unpaid' }, { payment_status: 'no_payment_required' }]) {
  test(`does not approve ${JSON.stringify(patch)}`, () => assert.equal(verifiedPayment(order(), session(patch)), null));
}
for (const patch of [
  { id: 'cs_another' }, { livemode: true }, { mode: 'subscription' }, { client_reference_id: 'other' },
  { metadata: {} }, { metadata: { ...session().metadata, checkout_request_id: 'other' } },
  { currency: 'usd' }, { amount_subtotal: 6400 }, { amount_total: 6999 }, { payment_intent: null },
  { total_details: { amount_shipping: 501, amount_tax: 0, amount_discount: 0 } },
  { total_details: { amount_shipping: 500, amount_tax: 0, amount_discount: 1 } },
  { total_details: { amount_shipping: 500, amount_tax: -1, amount_discount: 0 } },
  { total_details: { amount_shipping: 500, amount_tax: 100, amount_discount: 0 }, amount_total: 7100 },
]) test(`rejects mismatched payment ${JSON.stringify(patch)}`, () => assert.throws(() => verifiedPayment(order(), session(patch)), InvalidCheckoutSessionError));

test('rejects legacy provider and mode mismatch', () => {
  assert.throws(() => verifyCheckoutSession(order({ paymentProvider: 'godaddy' }), session()), InvalidCheckoutSessionError);
  assert.throws(() => verifyCheckoutSession(order({ stripeLivemode: null }), session()), InvalidCheckoutSessionError);
});
test('automatic tax requires complete calculation and correct total', () => {
  const withTax = order(); withTax.stripeCheckoutParams.automatic_tax.enabled = true;
  const taxed = session({ amount_total: 7910, total_details: { amount_shipping: 500, amount_tax: 910, amount_discount: 0 }, automatic_tax: { status: 'complete' } });
  assert.equal(verifiedPayment(withTax, taxed).taxCents, 910);
  assert.throws(() => verifiedPayment(withTax, { ...taxed, automatic_tax: { status: 'requires_location_inputs' } }));
});
test('idempotency safety window rejects old, invalid, and future attempts', () => {
  const now = Date.now();
  assert.equal(canCreateSession(new Date(now - 22 * 3600000).toISOString(), now), true);
  for (const time of [now - 23 * 3600000, now - 25 * 3600000, now + 1000]) assert.equal(canCreateSession(new Date(time).toISOString(), now), false);
  assert.equal(canCreateSession('invalid', now), false);
});
