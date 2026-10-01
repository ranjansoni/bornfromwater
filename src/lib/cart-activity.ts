import 'server-only';
import { createHmac } from 'node:crypto';
import { isUuid, signingSecret, validateCart } from './orders';
import { stripeConfiguration } from './stripe-config';
import type { StoredCartLine } from './order-store';

export type CartScope = { accountId: string; livemode: boolean; origin: string };
export type CartSnapshot = { id: string; revision: number; items: StoredCartLine[]; subtotal: number; fingerprint: string };
export function cartFingerprint(items: { slug?: string; quantity: number }[]) {
  return items.map(i => `${i.slug}:${i.quantity}`).sort().join('|');
}
export function trackingIdentity(value: unknown, scope: CartScope, secret = signingSecret()) {
  const v = value as { token?: unknown; revision?: unknown } | null;
  if (!v || !isUuid(v.token) || !Number.isSafeInteger(v.revision) || Number(v.revision) < 1) throw new Error('Invalid cart identity.');
  const id = createHmac('sha256', secret).update(`cart-activity:v1:${scope.accountId}:${scope.livemode}:${v.token}`).digest('hex');
  return { id, revision: Number(v.revision) };
}
export function cartSnapshot(value: unknown, scope: CartScope, secret = signingSecret()): CartSnapshot {
  const v = value as { items?: unknown } | null;
  const identity = trackingIdentity(value, scope, secret);
  if (Array.isArray(v?.items) && v.items.length === 0) return { ...identity, items: [], subtotal: 0, fingerprint: '' };
  const cart = validateCart(v?.items);
  const items = cart.lines.map(({ product, quantity }) => ({ slug: product.slug, sku: product.sku,
    name: product.name, unitPriceCents: product.priceCents, quantity }));
  return { ...identity, items, subtotal: cart.totalCents, fingerprint: cartFingerprint(items) };
}
export function validCartOrigin(request: Request, scope: CartScope, deploymentUrl = process.env.VERCEL_URL) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const allowed = [scope.origin];
  if (deploymentUrl && /^[a-z0-9.-]+\.vercel\.app$/i.test(deploymentUrl)) allowed.push(`https://${deploymentUrl}`);
  return allowed.includes(request.headers.get('origin') ?? '');
}
export const cartScope = () => stripeConfiguration();
