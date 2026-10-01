import Stripe from 'stripe';
import { purchaseEligibility } from '../src/lib/purchase-location.ts';
export const vercelPurchaseEligibility = headers => purchaseEligibility(headers, { VERCEL: '1', NODE_ENV: 'production' });
export const checkoutId = '22222222-2222-4222-8222-222222222222';
export const orderId = '11111111-1111-4111-8111-111111111111';
export const accountId = 'acct_sandbox';
export const secret = 'whsec_local_test_only';
export const config = { accountId, secretKey: 'sk_test_local_fixture', livemode: false, origin: 'http://localhost:3000', countries: ['CA'], shippingCents: 500, automaticTax: false };
export const sdk = new Stripe(config.secretKey);
export function order(overrides = {}) {
  return { orderId, checkoutRequestId: checkoutId, totalCents: 6500, currency: 'CAD',
    paymentProvider: 'stripe', stripeAccountId: accountId, stripeLivemode: false,
    stripeSessionId: 'cs_test_one', paymentStatus: 'pending', paidTotalCents: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    validatedCart: [{ sku: 'BFW-TEST', slug: 'test', name: 'Test bracelet', quantity: 1, unitPriceCents: 6500 }],
    stripeCheckoutParams: { automatic_tax: { enabled: false }, shipping_options: [{ shipping_rate_data: { fixed_amount: { amount: 500 } } }] },
    ...overrides };
}
export function session(overrides = {}) {
  return { id: 'cs_test_one', object: 'checkout.session', mode: 'payment', livemode: false,
    client_reference_id: orderId, metadata: { order_id: orderId, checkout_request_id: checkoutId },
    currency: 'cad', amount_subtotal: 6500, amount_total: 7000,
    total_details: { amount_shipping: 500, amount_tax: 0, amount_discount: 0 },
    automatic_tax: { status: null }, status: 'complete', payment_status: 'paid', payment_intent: 'pi_one',
    customer_details: { email: 'buyer@example.com' }, collected_information: { shipping_details: { name: 'Test Buyer', address: { country: 'CA', city: 'Vancouver', line1: '123 Test St', postal_code: 'V6B 1A1' } } },
    custom_fields: [{ key: 'sizingnote', text: { value: '6 inches' } }], url: 'https://checkout.stripe.com/c/pay/cs_test_one', ...overrides };
}
export function webhookRequest(type, object, overrides = {}) {
  const payload = JSON.stringify({ id: 'evt_test', object: 'event', type, livemode: false, data: { object }, ...overrides });
  return new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: payload,
    headers: { 'stripe-signature': sdk.webhooks.generateTestHeaderString({ payload, secret }) } });
}
