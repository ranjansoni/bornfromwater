import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCart } from '../src/lib/orders.ts';
import { products } from '../src/lib/catalog-seed.ts';
import { cartKey, shouldClearPaidCart } from '../src/lib/checkout-attempt.ts';
import { cartSnapshot, cartFingerprint } from '../src/lib/cart-activity.ts';
const slug = products[0].slug;
const item = (size, quantity = 1) => ({ slug, size, quantity });
test('legacy carts default to medium and duplicate size variants are rejected', () => {
  assert.equal(validateCart([{ slug, quantity: 1 }], products).lines[0].size, 'medium');
  assert.throws(() => validateCart([item('small'), item('small')], products));
  assert.throws(() => validateCart([{ slug, quantity: 1 }, item('medium')], products));
  assert.equal(validateCart([item('small'), item('large')], products).lines.length, 2);
});
test('size affects payment identity, independently of line ordering', () => {
  assert.notEqual(validateCart([item('small')], products).fingerprint, validateCart([item('large')], products).fingerprint);
  assert.equal(cartKey([item('small'), item('large')]), cartKey([item('large'), item('small')]));
  assert.equal(cartKey([{ slug, quantity: 1 }]), cartKey([item('medium')]));
  assert.equal(shouldClearPaidCart({ checkoutId: 'paid', cartKey: cartKey([item('small')]) }, 'paid', [item('large')]), false);
});
test('anonymous cart snapshots preserve chosen sizes and distinguish size changes', () => {
  const snapshot = cartSnapshot({ token: '00000000-0000-4000-8000-000000000001', revision: 1, items: [item('small'), item('large')] }, { accountId: 'test', livemode: false, origin: 'http://localhost' }, 'test secret', products);
  assert.deepEqual(snapshot.items.map(line => line.size), ['small', 'large']);
  assert.notEqual(cartFingerprint([item('small')]), cartFingerprint([item('large')]));
});
