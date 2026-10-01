import 'server-only';
import { neon } from '@neondatabase/serverless';
import type { CartScope, CartSnapshot } from './cart-activity';
import type { StoredCartLine } from './order-store';

type Query = { query: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]> };
export type ObservedCart = { id: string; items: StoredCartLine[]; subtotal: number; firstSeen: string;
  lastActivity: string; stage: 'recent' | 'abandoned'; orderId: string | null };
const eligible = `WITH eligible AS (
  SELECT c.*, CASE WHEN c.last_activity <= now() - interval '24 hours' THEN 'abandoned' ELSE 'recent' END AS stage,
    (SELECT o.order_id FROM cart_checkout_links l JOIN orders o ON o.order_id = l.order_id
      WHERE l.cart_id = c.cart_id AND l.fingerprint = c.fingerprint AND o.payment_provider = 'stripe'
        AND o.stripe_account_id = $1 AND o.stripe_livemode = $2 ORDER BY o.created_at DESC LIMIT 1) AS order_id
  FROM cart_activity c WHERE c.stripe_account_id = $1 AND c.stripe_livemode = $2
    AND c.last_activity > now() - interval '30 days' AND jsonb_array_length(c.items) > 0
    AND NOT EXISTS (SELECT 1 FROM cart_checkout_links l JOIN orders o ON o.order_id = l.order_id
      WHERE l.cart_id = c.cart_id AND l.fingerprint = c.fingerprint AND o.payment_provider = 'stripe'
        AND o.stripe_account_id = $1 AND o.stripe_livemode = $2 AND o.payment_status IN ('approved', 'processing'))
)`;

export function createCartActivityStore(client: Query) {
  async function allowObservation(scope: CartScope) {
    // A bounded global limit prevents this public endpoint from creating unlimited records.
    // Only expired observations are pruned; the orders table is never changed.
    const rows = await client.query(`WITH pruned AS (
      DELETE FROM cart_activity WHERE cart_id IN (SELECT cart_id FROM cart_activity
        WHERE last_activity <= now() - interval '30 days' AND stripe_account_id = $2 AND stripe_livemode = $3 LIMIT 500)
    ) INSERT INTO cart_activity_limits (bucket, attempts, window_start) VALUES ($1, 1, now())
      ON CONFLICT (bucket) DO UPDATE SET
        attempts = CASE WHEN cart_activity_limits.window_start <= now() - interval '1 hour' THEN 1 ELSE cart_activity_limits.attempts + 1 END,
        window_start = CASE WHEN cart_activity_limits.window_start <= now() - interval '1 hour' THEN now() ELSE cart_activity_limits.window_start END
      RETURNING attempts`, [`${scope.accountId}:${scope.livemode}`, scope.accountId, scope.livemode]);
    return Number(rows[0].attempts) <= 10000;
  }
  async function observe(snapshot: CartSnapshot, scope: CartScope) {
    await client.query(`INSERT INTO cart_activity (cart_id, stripe_account_id, stripe_livemode, items, subtotal_cents, fingerprint, revision)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      ON CONFLICT (cart_id) DO UPDATE SET items = EXCLUDED.items, subtotal_cents = EXCLUDED.subtotal_cents,
        fingerprint = EXCLUDED.fingerprint, revision = EXCLUDED.revision, last_activity = now()
      WHERE cart_activity.revision < EXCLUDED.revision
        AND cart_activity.stripe_account_id = EXCLUDED.stripe_account_id AND cart_activity.stripe_livemode = EXCLUDED.stripe_livemode`,
    [snapshot.id, scope.accountId, scope.livemode, JSON.stringify(snapshot.items), snapshot.subtotal, snapshot.fingerprint, snapshot.revision]);
  }
  async function linkCheckout(snapshot: CartSnapshot, orderId: string, scope: CartScope) {
    await observe(snapshot, scope);
    await client.query(`INSERT INTO cart_checkout_links (cart_id, order_id, fingerprint)
      SELECT $1, o.order_id, $3 FROM orders o WHERE o.order_id = $2 AND o.payment_provider = 'stripe'
        AND o.stripe_account_id = $4 AND o.stripe_livemode = $5
        AND EXISTS (SELECT 1 FROM cart_activity WHERE cart_id = $1 AND stripe_account_id = $4 AND stripe_livemode = $5)
      ON CONFLICT (cart_id, order_id) DO NOTHING`, [snapshot.id, orderId, snapshot.fingerprint, scope.accountId, scope.livemode]);
  }
  async function list(scope: CartScope, filter: string, page = 1) {
    const stage = filter === 'recent' ? 'recent' : 'abandoned';
    page = Math.max(1, Math.min(10000, Math.floor(page) || 1));
    const [rows, totals] = await Promise.all([
      client.query(`${eligible} SELECT * FROM eligible WHERE stage = $3 ORDER BY last_activity DESC, cart_id LIMIT 51 OFFSET $4`,
        [scope.accountId, scope.livemode, stage, (page - 1) * 50]),
      client.query(`${eligible} SELECT stage, count(*)::integer AS count FROM eligible GROUP BY stage`, [scope.accountId, scope.livemode]),
    ]);
    const orders: ObservedCart[] = rows.slice(0, 50).map(r => ({ id: String(r.cart_id), items: r.items as StoredCartLine[],
      subtotal: Number(r.subtotal_cents), firstSeen: new Date(r.first_seen as string).toISOString(),
      lastActivity: new Date(r.last_activity as string).toISOString(), stage: r.stage as ObservedCart['stage'], orderId: r.order_id ? String(r.order_id) : null }));
    return { carts: orders, counts: Object.fromEntries(totals.map(r => [String(r.stage), Number(r.count)])), page, stage, hasMore: rows.length > 50 };
  }
  return { allowObservation, observe, linkCheckout, list };
}
export const cartActivity = createCartActivityStore({ query: async (sql, params) => {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable.');
  return neon(process.env.DATABASE_URL).query(sql, params, { fetchOptions: { signal: AbortSignal.timeout(3000) } });
} });
