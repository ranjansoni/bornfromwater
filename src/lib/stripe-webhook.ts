import "server-only";
import type Stripe from "stripe";
import { getOrder, recordStripePayment, recordStripeStatus } from "@/lib/order-store";
import { isUuid } from "@/lib/orders";
import { InvalidCheckoutSessionError, verifyCheckoutSession } from "@/lib/checkout-service";
import { confirmStripeSession, verifyStripeAccount } from "@/lib/stripe-checkout";
import { stripeClient } from "@/lib/stripe";
import { stripeConfiguration } from "@/lib/stripe-config";

const eventTypes = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired"]);
const defaults = { getOrder, recordStripePayment, recordStripeStatus, stripeClient, stripeConfiguration,
  webhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET };

export async function handleStripeWebhook(request: Request, deps = defaults) {
  let stripe: Stripe;
  let config: ReturnType<typeof stripeConfiguration>;
  let secret: string;
  try {
    config = deps.stripeConfiguration();
    stripe = deps.stripeClient();
    secret = deps.webhookSecret() ?? "";
    if (!secret.startsWith("whsec_")) throw new Error();
  } catch { return new Response("Webhook unavailable", { status: 503 }); }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch { return new Response("Invalid signature", { status: 400 }); }
  if (event.livemode !== config.livemode || (event.account && event.account !== config.accountId)) {
    return new Response("Account or mode mismatch", { status: 400 });
  }
  if (!eventTypes.has(event.type)) return Response.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  if (!orderId || !session.metadata?.checkout_request_id) return Response.json({ received: true });
  if (!isUuid(orderId)) return new Response("Invalid order", { status: 400 });

  try {
    const order = await deps.getOrder(orderId);
    // Retry DB failures and the race between Stripe creation and DB association.
    if (!order || !order.stripeSessionId) throw new Error("Order association pending");
    if (order.stripeAccountId !== config.accountId) throw new InvalidCheckoutSessionError();
    verifyCheckoutSession(order, session);
    // Retrieve through the pinned account. Current paid state wins over stale failures.
    await verifyStripeAccount(stripe, config.accountId);
    const current = await stripe.checkout.sessions.retrieve(session.id);
    verifyCheckoutSession(order, current);
    await confirmStripeSession(order, current, deps);
    if (event.type === "checkout.session.async_payment_failed" &&
        current.status === "complete" && current.payment_status === "unpaid") {
      await deps.recordStripeStatus(order.orderId, current.id, "declined");
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe event was not recorded", { eventId: event.id, orderId });
    return new Response("Event could not be recorded", { status: error instanceof InvalidCheckoutSessionError ? 400 : 503 });
  }
}
