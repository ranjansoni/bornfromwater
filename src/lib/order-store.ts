import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import type { ValidatedCartLine } from "@/lib/orders";
import { paymentCurrency, type PaymentCurrency } from "@/lib/payment-currency";
import type Stripe from "stripe";
import type { VerifiedPayment } from "@/lib/checkout-service";

export type PaymentStatus = "pending" | "processing" | "approved" | "declined" | "expired";

export type StoredCartLine = {
  sku: string;
  slug?: string;
  name?: string;
  quantity: number;
  unitPriceCents: number;
};

export type StoredOrder = {
  orderId: string;
  validatedCart: StoredCartLine[];
  totalCents: number;
  currency: PaymentCurrency;
  paymentStatus: PaymentStatus;
  checkoutRequestId: string;
  godaddyTransactionId: string | null;
  paymentProvider: "stripe" | "godaddy";
  stripeSessionId: string | null;
  stripeAccountId: string | null;
  stripeLivemode: boolean | null;
  stripeCheckoutParams: Stripe.Checkout.SessionCreateParams | null;
  paidTotalCents: number | null;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  order_id: string;
  validated_cart: StoredCartLine[];
  total_cents: number;
  currency: PaymentCurrency;
  payment_status: PaymentStatus;
  checkout_request_id: string;
  godaddy_transaction_id: string | null;
  payment_provider: "stripe" | "godaddy";
  stripe_session_id: string | null;
  stripe_account_id: string | null;
  stripe_livemode: boolean | null;
  stripe_checkout_params: Stripe.Checkout.SessionCreateParams | null;
  paid_total_cents: number | null;
  created_at: string | Date;
  updated_at: string | Date;
};

let sqlClient: NeonQueryFunction<false, false> | null = null;

function sql(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  if (!sqlClient) sqlClient = neon(databaseUrl);
  return sqlClient;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapOrder(row: OrderRow): StoredOrder {
  return {
    orderId: row.order_id,
    validatedCart: row.validated_cart,
    totalCents: row.total_cents,
    currency: row.currency,
    paymentStatus: row.payment_status,
    checkoutRequestId: row.checkout_request_id,
    godaddyTransactionId: row.godaddy_transaction_id,
    paymentProvider: row.payment_provider,
    stripeSessionId: row.stripe_session_id,
    stripeAccountId: row.stripe_account_id,
    stripeLivemode: row.stripe_livemode,
    stripeCheckoutParams: row.stripe_checkout_params,
    paidTotalCents: row.paid_total_cents,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

const SELECT_COLUMNS = `
  order_id, validated_cart, total_cents, currency, payment_status,
  checkout_request_id, godaddy_transaction_id, created_at, updated_at,
  payment_provider, stripe_account_id, stripe_session_id, stripe_livemode, stripe_checkout_params, paid_total_cents
`;

export function createOrderStore(client: { query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]> }) {
  async function createPendingOrder(
    lines: ValidatedCartLine[],
    totalCents: number,
    checkoutRequestId: string,
    livemode: boolean,
    accountId: string,
  ): Promise<StoredOrder> {
    const validatedCart: StoredCartLine[] = lines.map(({ product, quantity }) => ({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
    }));
    const orderId = randomUUID();
    const currency = paymentCurrency();

    const inserted = await client.query(
      `INSERT INTO orders (
         order_id, validated_cart, total_cents, currency, payment_status, checkout_request_id,
         payment_provider, stripe_livemode, stripe_account_id
       ) VALUES ($1, $2::jsonb, $3, $5, 'pending', $4, 'stripe', $6, $7)
       ON CONFLICT (checkout_request_id) DO NOTHING
       RETURNING ${SELECT_COLUMNS}`,
      [orderId, JSON.stringify(validatedCart), totalCents, checkoutRequestId, currency, livemode, accountId],
    );

    const row = (inserted[0] ?? (await client.query(
      `SELECT ${SELECT_COLUMNS} FROM orders WHERE checkout_request_id = $1`,
      [checkoutRequestId],
    ))[0]) as OrderRow | undefined;

    if (!row) throw new Error("The pending order could not be created.");
    const order = mapOrder(row);
    return order;
  }

  async function getOrder(orderId: string): Promise<StoredOrder | null> {
    const rows = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM orders WHERE order_id = $1`,
      [orderId],
    );
    return rows[0] ? mapOrder(rows[0] as OrderRow) : null;
  }

  async function saveCheckoutParams(orderId: string, params: Stripe.Checkout.SessionCreateParams) {
    const rows = await client.query(
      `UPDATE orders
         SET stripe_checkout_params = COALESCE(stripe_checkout_params, $2::jsonb)
       WHERE order_id = $1 AND payment_provider = 'stripe'
       RETURNING stripe_checkout_params`,
      [orderId, JSON.stringify(params)],
    );
    if (!rows[0]) throw new Error("Checkout parameters could not be saved.");
    return rows[0].stripe_checkout_params as Stripe.Checkout.SessionCreateParams;
  }

  async function attachCheckoutSession(orderId: string, sessionId: string) {
    const rows = await client.query(
      `UPDATE orders
         SET stripe_session_id = $2, updated_at = now()
       WHERE order_id = $1 AND payment_provider = 'stripe'
         AND (stripe_session_id IS NULL OR stripe_session_id = $2)
       RETURNING order_id`,
      [orderId, sessionId],
    );
    if (rows.length !== 1) throw new Error("Checkout Session could not be saved.");
  }

  async function recordStripePayment(orderId: string, sessionId: string, payment: VerifiedPayment) {
    // Atomic and replay-safe. No emails/fulfillment side effects occur in this update.
    const rows = await client.query(
      `UPDATE orders
         SET payment_status = 'approved', stripe_payment_intent_id = $3,
             paid_total_cents = $4, shipping_cents = $5, tax_cents = $6,
             customer_email = $7, shipping_details = $8::jsonb, order_note = $9, updated_at = now()
       WHERE order_id = $1 AND stripe_session_id = $2 AND payment_provider = 'stripe'
         AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = $3)
       RETURNING order_id`,
      [orderId, sessionId, payment.paymentIntentId, payment.paidTotalCents, payment.shippingCents,
        payment.taxCents, payment.customerEmail, JSON.stringify(payment.shippingDetails), payment.orderNote],
    );
    if (rows.length !== 1) throw new Error("Stripe payment could not be saved.");
  }

  async function recordStripeStatus(orderId: string, sessionId: string, status: "processing" | "declined" | "expired") {
    // Late or duplicate events cannot downgrade a paid order or reopen a failed order.
    await client.query(
      `UPDATE orders SET payment_status = $3, updated_at = now()
       WHERE order_id = $1 AND stripe_session_id = $2 AND payment_provider = 'stripe'
         AND payment_status IN ('pending', 'processing')`,
      [orderId, sessionId, status],
    );
  }

  async function getOrderByCheckoutRequest(checkoutRequestId: string): Promise<StoredOrder | null> {
    const rows = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM orders WHERE checkout_request_id = $1`, [checkoutRequestId],
    );
    return rows[0] ? mapOrder(rows[0] as OrderRow) : null;
  }
  return { createPendingOrder, getOrder, getOrderByCheckoutRequest, saveCheckoutParams,
    attachCheckoutSession, recordStripePayment, recordStripeStatus };
}

export const { createPendingOrder, getOrder, getOrderByCheckoutRequest, saveCheckoutParams,
  attachCheckoutSession, recordStripePayment, recordStripeStatus } = createOrderStore({
    query: (text, params) => sql().query(text, params),
  });
