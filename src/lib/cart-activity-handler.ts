import 'server-only';
import { cartFingerprint, cartScope, cartSnapshot, trackingIdentity, validCartOrigin } from './cart-activity';
import { cartActivity } from './cart-activity-store';
import { catalog } from './catalog-store';
import { signingSecret } from './orders';
import type { StoredOrder } from './order-store';
const defaults = { scope: cartScope, ...cartActivity, snapshot: async (value: unknown, scope: ReturnType<typeof cartScope>) => cartSnapshot(value, scope, signingSecret(), await catalog.list()) };
const json = (status: number) => Response.json({ ok: status === 200 }, { status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
export async function handleCartActivity(request: Request, deps = defaults) {
  try {
    const scope = deps.scope();
    if (!validCartOrigin(request, scope)) return json(403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json(400);
    let snapshot;
    try {
      const raw = await request.text();
      if (raw.length > 12000) return json(400);
      snapshot = await deps.snapshot(JSON.parse(raw), scope);
    } catch { return json(400); }
    if (!await deps.allowObservation(scope)) return json(429);
    await deps.observe(snapshot, scope);
    return json(200);
  } catch { return json(503); }
}
export async function trackCartCheckout(request: Request, tracking: unknown, order: StoredOrder) {
  if (!tracking || order.paymentProvider !== 'stripe') return;
  const scope = cartScope();
  if (!validCartOrigin(request, scope) || order.stripeAccountId !== scope.accountId || order.stripeLivemode !== scope.livemode) return;
  const identity = trackingIdentity(tracking, scope);
  if (!await cartActivity.allowObservation(scope)) return;
  await cartActivity.linkCheckout({ ...identity, items: order.validatedCart, subtotal: order.totalCents,
    fingerprint: cartFingerprint(order.validatedCart) }, order.orderId, scope);
}
