import "server-only";
import type Stripe from "stripe";
import { canCreateSession, verifiedPayment, verifyCheckoutSession } from "@/lib/checkout-service";
import { attachCheckoutSession, recordStripePayment, recordStripeStatus, saveCheckoutParams,
  type StoredOrder } from "@/lib/order-store";
import { signOrderToken } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";
import { stripeConfiguration } from "@/lib/stripe-config";

export class CheckoutExpiredError extends Error {}

const defaults = { stripeClient, stripeConfiguration, saveCheckoutParams, attachCheckoutSession,
  recordStripePayment, recordStripeStatus };

export function statusPath(order: StoredOrder) {
  const token = signOrderToken({ version: 1, orderId: order.orderId, checkoutRequestId: order.checkoutRequestId });
  return `/checkout/status?token=${encodeURIComponent(token)}`;
}

export async function confirmStripeSession(order: StoredOrder, session: Stripe.Checkout.Session,
  store = { recordStripePayment, recordStripeStatus }) {
  const payment = verifiedPayment(order, session);
  if (payment) {
    await store.recordStripePayment(order.orderId, session.id, payment);
  } else if (session.status === "expired") {
    await store.recordStripeStatus(order.orderId, session.id, "expired");
  } else if (session.status === "complete") {
    await store.recordStripeStatus(order.orderId, session.id, "processing");
  }
}

export async function checkoutDestination(order: StoredOrder, deps = defaults) {
  const config = deps.stripeConfiguration();
  if (order.paymentProvider !== "stripe" || order.stripeLivemode !== config.livemode ||
      order.stripeAccountId !== config.accountId) {
    throw new Error("Checkout account mode does not match the order.");
  }
  const destination = statusPath(order);
  if (order.paymentStatus === "approved" || order.paymentStatus === "processing") return destination;
  if (order.paymentStatus === "expired" || order.paymentStatus === "declined") {
    throw new CheckoutExpiredError("This checkout has ended. Please continue again to start a new checkout.");
  }
  const stripe = deps.stripeClient();
  await verifyStripeAccount(stripe, config.accountId);
  let session: Stripe.Checkout.Session;
  if (order.stripeSessionId) {
    session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  } else {
    if (!canCreateSession(order.createdAt)) {
      throw new Error("This checkout needs reconciliation. Please contact the shop before paying again.");
    }
    // Freeze the exact request in Postgres before contacting Stripe. Concurrent requests,
    // timeouts, deploys and config changes reuse identical parameters and idempotency keys.
    const params = await deps.saveCheckoutParams(order.orderId, {
      mode: "payment",
      ui_mode: "hosted_page",
      integration_identifier: "bornfromwater_hosted_djhyjqve",
      client_reference_id: order.orderId,
      metadata: { order_id: order.orderId, checkout_request_id: order.checkoutRequestId },
      payment_intent_data: { metadata: { order_id: order.orderId } },
      line_items: order.validatedCart.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "cad", unit_amount: line.unitPriceCents, tax_behavior: "exclusive",
          product_data: { name: line.name ?? line.sku, metadata: { sku: line.sku } },
        },
      })),
      adaptive_pricing: { enabled: false },
      automatic_tax: { enabled: config.automaticTax },
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: config.countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: [{ shipping_rate_data: {
        type: "fixed_amount", display_name: "Standard shipping",
        fixed_amount: { amount: config.shippingCents, currency: "cad" }, tax_behavior: "exclusive",
      } }],
      custom_fields: [{ key: "sizingnote", label: { type: "custom", custom: "Bracelet size / order note" },
        type: "text", optional: true, text: { maximum_length: 255 } }],
      success_url: `${config.origin}${destination}`,
      cancel_url: `${config.origin}/checkout?cancelled=1`,
      expires_at: Math.floor(Date.parse(order.createdAt) / 1000) + 24 * 60 * 60,
    });
    session = await stripe.checkout.sessions.create(params, { idempotencyKey: `bfw-checkout-${order.orderId}` });
    if (session.livemode !== order.stripeLivemode) throw new Error("Stripe mode mismatch.");
    await deps.attachCheckoutSession(order.orderId, session.id);
    order = { ...order, stripeSessionId: session.id, stripeCheckoutParams: params };
  }
  verifyCheckoutSession(order, session);
  if (session.status === "expired") {
    await deps.recordStripeStatus(order.orderId, session.id, "expired");
    throw new CheckoutExpiredError("This checkout has expired. Please continue again to start a new checkout.");
  }
  if (session.status === "complete") {
    await confirmStripeSession(order, session, deps);
    return destination;
  }
  if (!session.url || session.status !== "open") throw new Error("Stripe checkout is unavailable.");
  return session.url;
}

export async function verifyStripeAccount(stripe: Stripe, accountId: string) {
  const account = await stripe.accounts.retrieveCurrent();
  if (account.id !== accountId) throw new Error("Stripe credentials belong to another account.");
}

export async function refreshStripeOrder(order: StoredOrder) {
  if (order.paymentProvider !== "stripe" || !order.stripeSessionId || order.paymentStatus === "approved") return;
  const config = stripeConfiguration();
  if (order.stripeAccountId !== config.accountId || order.stripeLivemode !== config.livemode) {
    throw new Error("Checkout account does not match the order.");
  }
  const stripe = stripeClient();
  await verifyStripeAccount(stripe, config.accountId);
  await confirmStripeSession(order, await stripe.checkout.sessions.retrieve(order.stripeSessionId));
}
