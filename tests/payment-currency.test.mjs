import test from 'node:test';
import assert from 'node:assert/strict';
import { canDisplayPaymentCurrency, paymentCurrency, formatPaymentAmount } from '../src/lib/payment-currency.ts';
import { stripeConfiguration } from '../src/lib/stripe-config.ts';
import { signOrderToken, verifyOrderToken, validateCart } from '../src/lib/orders.ts';
import { cartKey, readAttempt, forgetAttempt, shouldClearPaidCart } from '../src/lib/checkout-attempt.ts';
import { products } from '../src/lib/catalog-seed.ts';
import { checkoutId, orderId, accountId } from './fixtures.mjs';

const env = { STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', STRIPE_ACCOUNT_ID: accountId };
process.env.ORDER_SIGNING_SECRET = 'test-only-signing-secret-at-least-32-characters';
test('new payments always use CAD; historical USD remains readable', () => {
  assert.equal(paymentCurrency(), 'CAD'); assert.equal(canDisplayPaymentCurrency('USD'), true);
  assert.match(formatPaymentAmount(6500, 'CAD'), /65.00/);
});
test('sandbox defaults are explicit; live mode is opt-in', () => {
  assert.deepEqual(stripeConfiguration(env).countries, ['CA']);
  assert.equal(stripeConfiguration(env).shippingCents, 0);
  assert.throws(() => stripeConfiguration({ ...env, STRIPE_SECRET_KEY: 'sk_live_fixture' }));
  const live = { ...env, STRIPE_SECRET_KEY: 'sk_live_fixture', STRIPE_ALLOW_LIVE: 'true', APP_URL: 'https://bornfromwater.ca', STRIPE_SHIPPING_COUNTRIES: 'CA', STRIPE_SHIPPING_CENTS: '500', STRIPE_AUTOMATIC_TAX: 'false' };
  assert.equal(stripeConfiguration(live).livemode, true);
  assert.throws(() => stripeConfiguration({ ...live, VERCEL_ENV: 'preview' }));
});
for (const patch of [{ STRIPE_WEBHOOK_SECRET: '' }, { STRIPE_ACCOUNT_ID: '' }, { STRIPE_SECRET_KEY: 'bad' }, { APP_URL: 'https://user:pass@example.com' }, { APP_URL: 'http://example.com' }, { APP_URL: 'https://example.com/path' }, { STRIPE_SHIPPING_CENTS: '-1' }, { STRIPE_AUTOMATIC_TAX: 'yes' }]) {
  test(`rejects invalid config ${JSON.stringify(patch)}`, () => assert.throws(() => stripeConfiguration({ ...env, ...patch })));
}
test('signed order tokens reject tampering and malformed IDs', () => {
  const identity = { version: 1, orderId, checkoutRequestId: checkoutId }; const token = signOrderToken(identity);
  assert.deepEqual(verifyOrderToken(token), identity); assert.equal(verifyOrderToken(token + 'x'), null);
  assert.equal(verifyOrderToken(''), null); assert.equal(verifyOrderToken(signOrderToken({ ...identity, orderId: 'bad' })), null);
});
test('catalogue controls price; rejects duplicate, missing and invalid cart lines', () => {
  const product = products.find(p => !p.placeholder); const item = { slug: product.slug, quantity: 2, priceCents: 1 };
  assert.equal(validateCart([item], products).totalCents, product.priceCents * 2);
  for (const items of [[], null, [item,item], [{ ...item, quantity: 11 }], [{ ...item, quantity: 1.5 }], [{ slug: 'missing', quantity: 1 }]]) assert.throws(() => validateCart(items, products));
});
test('legacy browser attempts retain identity and changed carts are never cleared', () => {
  const items = [{ slug: 'b', quantity: 1 }, { slug: 'a', quantity: 1 }];
  let value = JSON.stringify({ checkoutId, cartKey: JSON.stringify(items) });
  const storage = { getItem: () => value, removeItem: () => { value = null; } };
  const attempt = readAttempt(storage);
  assert.equal(attempt.cartKey, cartKey([...items].reverse()));
  assert.equal(shouldClearPaidCart(attempt, checkoutId, items), true);
  assert.equal(shouldClearPaidCart(attempt, orderId, items), false);
  assert.equal(shouldClearPaidCart(attempt, checkoutId, [{ slug: 'new', quantity: 1 }]), false);
  forgetAttempt(storage, orderId); assert.notEqual(value, null);
  forgetAttempt(storage, checkoutId); assert.equal(value, null);
  value = '{bad'; assert.throws(() => readAttempt(storage));
});
