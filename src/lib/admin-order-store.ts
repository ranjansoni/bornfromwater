import 'server-only';
import { neon } from '@neondatabase/serverless';
import type { StoredCartLine } from './order-store';
import type { DeliveryContact, FulfillmentStatus, FulfillmentUpdate } from './order-management';

type Query = { query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]> };
export type OrderScope = { accountId: string; livemode: boolean };
export type AdminOrder = {
  orderId: string; createdAt: string; paymentStatus: string; provider: string; livemode: boolean | null;
  currency: string; subtotal: number; total: number; shipping: number; tax: number;
  items: StoredCartLine[]; customer: DeliveryContact; originalCustomer: DeliveryContact;
  orderNote: string; status: FulfillmentStatus; carrier: string; trackingNumber: string; trackingUrl: string;
  internalNote: string; version: number; updatedAt: string | null; paymentIntentId: string | null;
};
export type FulfillmentEvent = { id: string; status: FulfillmentStatus; carrier: string; trackingNumber: string; createdAt: string };
const columns = `o.order_id, o.created_at, o.payment_status, o.payment_provider, o.stripe_livemode,
  o.currency, o.total_cents, o.paid_total_cents, o.shipping_cents, o.tax_cents, o.validated_cart,
  o.customer_email, o.shipping_details, o.order_note, o.stripe_payment_intent_id,
  f.status, f.carrier, f.tracking_number, f.tracking_url, f.customer_details, f.internal_note,
  f.version, f.updated_at AS fulfillment_updated_at`;
const iso = (v: unknown) => new Date(v as string | Date).toISOString();
const str = (v: unknown) => typeof v === 'string' ? v : '';
function mapOrder(row: Record<string, unknown>): AdminOrder {
  const shipping = (row.shipping_details ?? {}) as { name?: string; phone?: string; address?: Record<string, string> };
  const address = shipping.address ?? {};
  const originalCustomer: DeliveryContact = { name: str(shipping.name), email: str(row.customer_email), phone: str(shipping.phone),
    line1: str(address.line1), line2: str(address.line2), city: str(address.city), province: str(address.state),
    postalCode: str(address.postal_code), country: str(address.country) };
  return { orderId: str(row.order_id), createdAt: iso(row.created_at), paymentStatus: str(row.payment_status),
    provider: str(row.payment_provider), livemode: row.stripe_livemode as boolean | null, currency: str(row.currency),
    subtotal: Number(row.total_cents), total: Number(row.paid_total_cents ?? row.total_cents),
    shipping: Number(row.shipping_cents ?? 0), tax: Number(row.tax_cents ?? 0), items: row.validated_cart as StoredCartLine[],
    customer: { ...originalCustomer, ...(row.customer_details as Partial<DeliveryContact> ?? {}) }, originalCustomer,
    orderNote: str(row.order_note), status: (row.status ?? 'unfulfilled') as FulfillmentStatus,
    carrier: str(row.carrier), trackingNumber: str(row.tracking_number), trackingUrl: str(row.tracking_url),
    internalNote: str(row.internal_note), version: Number(row.version ?? 0),
    updatedAt: row.fulfillment_updated_at ? iso(row.fulfillment_updated_at) : null,
    paymentIntentId: row.stripe_payment_intent_id as string | null };
}
export class OrderConflictError extends Error {}
export function createAdminOrderStore(client: Query) {
  async function listOrders(scope: OrderScope, filter = 'unfulfilled', search = '', page = 1) {
    const filters = ['unfulfilled', 'packed', 'shipped', 'delivered', 'all', 'history'];
    if (!filters.includes(filter)) filter = 'unfulfilled';
    page = Math.max(1, Math.min(10000, Math.floor(page) || 1));
    const rows = await client.query(`SELECT ${columns} FROM orders o LEFT JOIN order_fulfillment f USING (order_id)
      WHERE (($3 = 'history' AND o.payment_provider = 'godaddy') OR
        ($3 <> 'history' AND o.payment_provider = 'stripe' AND o.stripe_account_id = $1 AND o.stripe_livemode = $2
          AND o.payment_status = 'approved' AND ($3 = 'all' OR COALESCE(f.status, 'unfulfilled') = $3)))
        AND ($4 = '' OR o.order_id::text ILIKE $5 OR COALESCE(f.customer_details->>'email', o.customer_email, '') ILIKE $5
          OR COALESCE(f.customer_details->>'name', o.shipping_details->>'name', '') ILIKE $5 OR f.tracking_number ILIKE $5)
      ORDER BY o.created_at DESC, o.order_id DESC LIMIT 51 OFFSET $6`,
    [scope.accountId, scope.livemode, filter, search.slice(0, 100), `%${search.slice(0, 100)}%`, (page - 1) * 50]);
    return { orders: rows.slice(0, 50).map(mapOrder), hasMore: rows.length > 50, page, filter };
  }
  async function orderCounts(scope: OrderScope) {
    const rows = await client.query(`SELECT COALESCE(f.status, 'unfulfilled') AS status, count(*)::integer AS count
      FROM orders o LEFT JOIN order_fulfillment f USING (order_id)
      WHERE o.payment_provider = 'stripe' AND o.stripe_account_id = $1 AND o.stripe_livemode = $2 AND o.payment_status = 'approved'
      GROUP BY COALESCE(f.status, 'unfulfilled')`, [scope.accountId, scope.livemode]);
    return Object.fromEntries(rows.map(r => [String(r.status), Number(r.count)]));
  }
  async function getAdminOrder(orderId: string, scope: OrderScope) {
    const rows = await client.query(`SELECT ${columns} FROM orders o LEFT JOIN order_fulfillment f USING (order_id)
      WHERE o.order_id = $1 AND (o.payment_provider = 'godaddy' OR
        (o.payment_provider = 'stripe' AND o.stripe_account_id = $2 AND o.stripe_livemode = $3))`,
    [orderId, scope.accountId, scope.livemode]);
    return rows[0] ? mapOrder(rows[0]) : null;
  }
  async function orderEvents(orderId: string) {
    const rows = await client.query(`SELECT id, status, carrier, tracking_number, created_at FROM order_fulfillment_events
      WHERE order_id = $1 ORDER BY id DESC LIMIT 30`, [orderId]);
    return rows.map(r => ({ id: String(r.id), status: r.status as FulfillmentStatus, carrier: str(r.carrier),
      trackingNumber: str(r.tracking_number), createdAt: iso(r.created_at) }));
  }
  async function updateFulfillment(orderId: string, update: FulfillmentUpdate, scope: OrderScope) {
    // Payment verification fields and historical orders are never written here.
    // Version checks prevent two browser tabs silently overwriting one another.
    const rows = await client.query(`WITH saved AS (
      INSERT INTO order_fulfillment (order_id, status, carrier, tracking_number, tracking_url, customer_details, internal_note)
      SELECT order_id, $2, $3, $4, $5, $6::jsonb, $7 FROM orders
      WHERE order_id = $1 AND payment_provider = 'stripe' AND payment_status = 'approved'
        AND stripe_account_id = $9 AND stripe_livemode = $10
        AND ($8::integer = 0 OR EXISTS (SELECT 1 FROM order_fulfillment WHERE order_id = $1))
      ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status, carrier = EXCLUDED.carrier,
        tracking_number = EXCLUDED.tracking_number, tracking_url = EXCLUDED.tracking_url,
        customer_details = EXCLUDED.customer_details, internal_note = EXCLUDED.internal_note,
        version = order_fulfillment.version + 1, updated_at = now()
      WHERE order_fulfillment.version = $8::integer RETURNING *
    ), logged AS (
      INSERT INTO order_fulfillment_events (order_id, status, carrier, tracking_number)
      SELECT order_id, status, carrier, tracking_number FROM saved RETURNING id
    ) SELECT version FROM saved`, [orderId, update.status, update.carrier, update.trackingNumber, update.trackingUrl,
      JSON.stringify(update.customer), update.internalNote, update.version, scope.accountId, scope.livemode]);
    if (!rows.length) throw new OrderConflictError('This order changed or is not available for fulfillment. Reload it before saving.');
    return Number(rows[0].version);
  }
  async function consumeLoginAttempt() {
    const rows = await client.query(`INSERT INTO admin_login_limits (bucket, attempts, window_start) VALUES ('owner', 1, now())
      ON CONFLICT (bucket) DO UPDATE SET
        attempts = CASE WHEN admin_login_limits.window_start < now() - interval '15 minutes' THEN 1 ELSE admin_login_limits.attempts + 1 END,
        window_start = CASE WHEN admin_login_limits.window_start < now() - interval '15 minutes' THEN now() ELSE admin_login_limits.window_start END
      RETURNING attempts`);
    return Number(rows[0].attempts) <= 20;
  }
  return { listOrders, orderCounts, getAdminOrder, orderEvents, updateFulfillment, consumeLoginAttempt };
}
export const adminOrders = createAdminOrderStore({ query: async (query, params) => {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable.');
  return neon(process.env.DATABASE_URL).query(query, params);
} });
