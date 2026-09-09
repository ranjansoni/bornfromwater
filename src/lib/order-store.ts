import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import type { ValidatedCartLine } from "@/lib/orders";

export type PaymentStatus = "pending" | "processing" | "approved" | "declined";

export type StoredCartLine = {
  sku: string;
  quantity: number;
  unitPriceCents: number;
};

export type StoredOrder = {
  orderId: string;
  validatedCart: StoredCartLine[];
  totalCents: number;
  currency: "CAD";
  paymentStatus: PaymentStatus;
  checkoutRequestId: string;
  godaddyTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  order_id: string;
  validated_cart: StoredCartLine[];
  total_cents: number;
  currency: "CAD";
  payment_status: PaymentStatus;
  checkout_request_id: string;
  godaddy_transaction_id: string | null;
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
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

const SELECT_COLUMNS = `
  order_id, validated_cart, total_cents, currency, payment_status,
  checkout_request_id, godaddy_transaction_id, created_at, updated_at
`;

export async function createPendingOrder(
  lines: ValidatedCartLine[],
  totalCents: number,
  checkoutRequestId: string,
): Promise<StoredOrder> {
  const validatedCart: StoredCartLine[] = lines.map(({ product, quantity }) => ({
    sku: product.sku,
    quantity,
    unitPriceCents: product.priceCents,
  }));
  const orderId = randomUUID();
  const client = sql();

  const inserted = await client.query(
    `INSERT INTO orders (
       order_id, validated_cart, total_cents, currency, payment_status, checkout_request_id
     ) VALUES ($1, $2::jsonb, $3, 'CAD', 'pending', $4)
     ON CONFLICT (checkout_request_id) DO NOTHING
     RETURNING ${SELECT_COLUMNS}`,
    [orderId, JSON.stringify(validatedCart), totalCents, checkoutRequestId],
  );

  const row = (inserted[0] ?? (await client.query(
    `SELECT ${SELECT_COLUMNS} FROM orders WHERE checkout_request_id = $1`,
    [checkoutRequestId],
  ))[0]) as OrderRow | undefined;

  if (!row) throw new Error("The pending order could not be created.");
  const order = mapOrder(row);
  const sameCart =
    order.validatedCart.length === validatedCart.length &&
    order.validatedCart.every((line, index) => {
      const expected = validatedCart[index];
      return (
        expected &&
        line.sku === expected.sku &&
        line.quantity === expected.quantity &&
        line.unitPriceCents === expected.unitPriceCents
      );
    });
  if (
    order.totalCents !== totalCents ||
    !sameCart
  ) {
    throw new Error("This checkout request belongs to a different cart.");
  }
  return order;
}

export async function getOrder(orderId: string): Promise<StoredOrder | null> {
  const rows = await sql().query(
    `SELECT ${SELECT_COLUMNS} FROM orders WHERE order_id = $1`,
    [orderId],
  );
  return rows[0] ? mapOrder(rows[0] as OrderRow) : null;
}

export async function claimOrderForPayment(orderId: string): Promise<boolean> {
  const rows = await sql().query(
    `UPDATE orders
       SET payment_status = 'processing', updated_at = now()
     WHERE order_id = $1 AND payment_status IN ('pending', 'declined')
     RETURNING order_id`,
    [orderId],
  );
  return rows.length === 1;
}

export async function markOrderApproved(orderId: string, transactionId: string): Promise<void> {
  const rows = await sql().query(
    `UPDATE orders
       SET payment_status = 'approved', godaddy_transaction_id = $2, updated_at = now()
     WHERE order_id = $1 AND payment_status = 'processing'
     RETURNING order_id`,
    [orderId, transactionId],
  );
  if (rows.length !== 1) throw new Error("The order could not be marked approved.");
}

export async function markOrderDeclined(orderId: string): Promise<void> {
  await sql().query(
    `UPDATE orders
       SET payment_status = 'declined', updated_at = now()
     WHERE order_id = $1 AND payment_status = 'processing'`,
    [orderId],
  );
}
