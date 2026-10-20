import test from 'node:test';
import assert from 'node:assert/strict';
import { canDisplayPaymentCurrency, paymentCurrency, formatPaymentAmount } from '../src/lib/payment-currency.ts';
import { stripeConfiguration } from '../src/lib/stripe-config.ts';
import { shippingConfiguration } from '../src/lib/shipping-config.ts';
import { signOrderToken, verifyOrderToken, validateCart } from '../src/lib/orders.ts';
import { cartKey, readAttempt, forgetAttempt, shouldClearPaidCart } from '../src/lib/checkout-attempt.ts';
import { products } from '../src/lib/catalog-seed.ts';
import { checkoutId, orderId, accountId } from './fixtures.mjs';

const env = { STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', STRIPE_ACCOUNT_ID: accountId, FREE_SHIPPING_OFFER_ENABLED: 'false' };
process.env.ORDER_SIGNING_SECRET = 'test-only-signing-secret-at-least-32-characters';
test('new payments always use CAD; historical USD remains readable', () => {
  assert.equal(paymentCurrency(), 'CAD'); assert.equal(canDisplayPaymentCurrency('USD'), true);
  assert.match(formatPaymentAmount(6500, 'CAD'), /65.00/);
});
test('sandbox defaults are explicit; live mode is opt-in', () => {
  assert.deepEqual(stripeConfiguration(env).countries, ['CA']);
  assert.equal(stripeConfiguration(env).shippingCents, 1000);
  assert.throws(() => stripeConfiguration({ ...env, STRIPE_SECRET_KEY: 'sk_live_fixture' }));
  const live = { ...env, STRIPE_SECRET_KEY: 'sk_live_fixture', STRIPE_ALLOW_LIVE: 'true', APP_URL: 'https://bornfromwater.ca', STRIPE_SHIPPING_COUNTRIES: 'CA', STRIPE_SHIPPING_CENTS: '500', STRIPE_AUTOMATIC_TAX: 'false' };
  assert.equal(stripeConfiguration(live).livemode, true);
  assert.throws(() => stripeConfiguration({ ...live, VERCEL_ENV: 'preview' }));
});
test('storefront delivery settings match Checkout without exposing payment credentials', () => {
  for (const shippingCents of [0, 1000, 1250]) {
    for (const automaticTax of [false, true]) {
      const settings = { STRIPE_SHIPPING_COUNTRIES: 'CA', STRIPE_SHIPPING_CENTS: String(shippingCents), STRIPE_AUTOMATIC_TAX: String(automaticTax), FREE_SHIPPING_OFFER_ENABLED: 'false' };
      const displayed = shippingConfiguration(settings);
      assert.deepEqual(displayed, { countries: ['CA'], shippingCents, complimentaryShipping: false, automaticTax });
      const checkout = stripeConfiguration({ ...env, ...settings });
      assert.equal(checkout.shippingCents, displayed.shippingCents);
      assert.equal(checkout.automaticTax, displayed.automaticTax);
      assert.deepEqual(shippingConfiguration({ ...env, ...settings }), displayed);
    }
  }
});
test('complimentary Canadian shipping matches Checkout and can be turned off', () => {
  const active = { ...env, STRIPE_SHIPPING_COUNTRIES: 'CA', STRIPE_SHIPPING_CENTS: '1000', FREE_SHIPPING_OFFER_ENABLED: 'true' };
  assert.equal(shippingConfiguration(active).shippingCents, 0);
  assert.equal(shippingConfiguration(active).complimentaryShipping, true);
  assert.equal(stripeConfiguration(active).shippingCents, 0);
  assert.equal(shippingConfiguration({ ...active, FREE_SHIPPING_OFFER_ENABLED: 'false' }).shippingCents, 1000);
  assert.equal(shippingConfiguration({ ...active, STRIPE_SHIPPING_COUNTRIES: 'CA,US' }).shippingCents, 1000);
});
for (const patch of [{ STRIPE_WEBHOOK_SECRET: '' }, { STRIPE_ACCOUNT_ID: '' }, { STRIPE_SECRET_KEY: 'bad' }, { APP_URL: 'https://user:pass@example.com' }, { APP_URL: 'http://example.com' }, { APP_URL: 'https://example.com/path' }, { STRIPE_SHIPPING_CENTS: '-1' }, { STRIPE_AUTOMATIC_TAX: 'yes' }, { FREE_SHIPPING_OFFER_ENABLED: 'yes' }]) {
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
