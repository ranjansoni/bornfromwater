import { cartKey } from './checkout-attempt';

const KEY = 'bfw-cart-observation-v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
type Item = { slug: string; quantity: number };
export type CartTracking = { token: string; revision: number };
type SavedTracking = CartTracking & { createdAt: number; empty: boolean };

// The random token identifies a browser cart, never a person. It is not an order token.
export function cartTracking(items: Item[], storage?: Pick<Storage, 'getItem' | 'setItem'>,
  now = Date.now(), uuid = () => crypto.randomUUID()): CartTracking | undefined {
  try {
    const target = storage ?? window.localStorage;
    let saved: SavedTracking | undefined;
    try { saved = JSON.parse(target.getItem(KEY) ?? 'null') ?? undefined; } catch { /* Start a fresh observation. */ }
    if (!saved || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.token) || !Number.isSafeInteger(saved.revision) ||
      saved.revision < 0 || saved.revision >= Number.MAX_SAFE_INTEGER - 1 ||
      !Number.isFinite(saved.createdAt) || saved.createdAt > now || now - saved.createdAt > MAX_AGE ||
      (saved.empty && items.length > 0)) {
      if (!items.length) return undefined;
      saved = { token: uuid(), revision: 0, createdAt: now, empty: false };
    }
    saved.revision = Math.max(now, saved.revision + 1);
    saved.empty = items.length === 0;
    target.setItem(KEY, JSON.stringify(saved));
    return { token: saved.token, revision: saved.revision };
  } catch { return undefined; } // Tracking must never prevent shopping when storage is blocked.
}

let queued: Promise<unknown> = Promise.resolve();
export function observeCart(items: Item[]) {
  const tracking = cartTracking(items);
  if (!tracking) return;
  const body = JSON.stringify({ items, ...tracking });
  queued = queued.catch(() => undefined).then(() => fetch('/api/cart-activity', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, signal: AbortSignal.timeout(5000),
  })).catch(() => undefined);
}

export function checkoutCartTracking(current: Item[], checkout: Item[]) {
  return cartKey(current) === cartKey(checkout) ? cartTracking(current) : undefined;
}
