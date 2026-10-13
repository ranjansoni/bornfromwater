import { DEFAULT_SIZE, cartLineKey, isBraceletSize, type BraceletSize } from "./bracelet-sizes";
export const CHECKOUT_ATTEMPT_KEY = "bfw-checkout-attempt";
export type CheckoutAttempt = { cartKey: string; checkoutId: string };

export function cartKey(items: { slug: string; size?: BraceletSize; quantity: number }[]) {
  return JSON.stringify(items.map(item => ({ slug: item.slug, size: item.size ?? DEFAULT_SIZE, quantity: item.quantity }))
    .sort((a, b) => cartLineKey(a.slug, a.size).localeCompare(cartLineKey(b.slug, b.size))));
}

export function readAttempt(storage: Pick<Storage, "getItem">): CheckoutAttempt | null {
  const raw = storage.getItem(CHECKOUT_ATTEMPT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const items = JSON.parse(value.cartKey);
    if (typeof value.checkoutId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.checkoutId) ||
        !Array.isArray(items) || items.some((item) => typeof item.slug !== "string" || !Number.isInteger(item.quantity) || (item.size !== undefined && !isBraceletSize(item.size)))) throw new Error();
    return { cartKey: cartKey(items), checkoutId: value.checkoutId };
  } catch {
    // A broken saved attempt must not silently become a second payment attempt.
    throw new Error("We couldn’t read your previous checkout. Contact us before paying again.");
  }
}

export function forgetAttempt(storage: Pick<Storage, "getItem" | "removeItem">, checkoutId: string) {
  if (readAttempt(storage)?.checkoutId === checkoutId) storage.removeItem(CHECKOUT_ATTEMPT_KEY);
}

export function shouldClearPaidCart(attempt: CheckoutAttempt | null, checkoutId: string,
  items: { slug: string; size?: BraceletSize; quantity: number }[]) {
  return attempt?.checkoutId === checkoutId && attempt.cartKey === cartKey(items);
}
