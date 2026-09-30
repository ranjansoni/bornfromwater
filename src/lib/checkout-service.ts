import type Stripe from "stripe";

export type CheckoutOrder = {
  orderId: string;
  checkoutRequestId: string;
  totalCents: number;
  currency: string;
  paymentProvider: "stripe" | "godaddy";
  stripeLivemode: boolean | null;
  stripeSessionId: string | null;
  stripeCheckoutParams: Stripe.Checkout.SessionCreateParams | null;
};

export class InvalidCheckoutSessionError extends Error {}

/** Called only with a signature-verified event or a server-retrieved Session. */
export function verifyCheckoutSession(order: CheckoutOrder, session: Stripe.Checkout.Session) {
  if (
    order.paymentProvider !== "stripe" ||
    order.stripeSessionId !== session.id ||
    order.stripeLivemode !== session.livemode ||
    session.mode !== "payment" ||
    session.client_reference_id !== order.orderId ||
    session.metadata?.order_id !== order.orderId ||
    session.metadata?.checkout_request_id !== order.checkoutRequestId ||
    session.currency?.toUpperCase() !== order.currency ||
    session.amount_subtotal !== order.totalCents
  ) {
    throw new InvalidCheckoutSessionError("Stripe Session does not match the order.");
  }
}

export function verifiedPayment(order: CheckoutOrder, session: Stripe.Checkout.Session) {
  verifyCheckoutSession(order, session);
  if (session.status !== "complete" || session.payment_status !== "paid") return null;

  const shipping = session.total_details?.amount_shipping;
  const tax = session.total_details?.amount_tax;
  const discount = session.total_details?.amount_discount;
  const expectedShipping = order.stripeCheckoutParams?.shipping_options?.[0]
    ?.shipping_rate_data?.fixed_amount?.amount;
  const automaticTax = order.stripeCheckoutParams?.automatic_tax?.enabled;
  const paymentIntent = typeof session.payment_intent === "string"
    ? session.payment_intent : session.payment_intent?.id;
  if (
    !paymentIntent || !Number.isSafeInteger(session.amount_total) ||
    !Number.isSafeInteger(shipping) || !Number.isSafeInteger(tax) ||
    shipping !== expectedShipping || shipping === undefined || tax === undefined || tax < 0 ||
    discount !== 0 || (!automaticTax && tax !== 0) ||
    (automaticTax && session.automatic_tax.status !== "complete") ||
    session.amount_total !== order.totalCents + shipping + tax
  ) {
    throw new InvalidCheckoutSessionError("Stripe payment totals could not be verified.");
  }
  return {
    paymentIntentId: paymentIntent,
    paidTotalCents: session.amount_total as number,
    shippingCents: shipping,
    taxCents: tax,
    customerEmail: session.customer_details?.email ?? null,
    shippingDetails: session.collected_information?.shipping_details ?? null,
    orderNote: session.custom_fields.find((field) => field.key === "sizingnote")?.text?.value ?? null,
  };
}

export type VerifiedPayment = NonNullable<ReturnType<typeof verifiedPayment>>;

// Never recreate a lost Session after Stripe's >=24h idempotency retention window.
// Old ambiguous attempts need reconciliation, not a second possible charge.
export function canCreateSession(createdAt: string, now = Date.now()): boolean {
  const age = now - Date.parse(createdAt);
  return Number.isFinite(age) && age >= 0 && age < 23 * 60 * 60 * 1000;
}
