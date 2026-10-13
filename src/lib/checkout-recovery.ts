import { cartKey, forgetAttempt, readAttempt } from "./checkout-attempt";
import type { SubmittedCartItem } from "./orders";

/** Returns a status destination if payment already completed or is processing. */
export async function recoverChangedCheckout(
  storage: Pick<Storage, "getItem" | "removeItem">,
  items: SubmittedCartItem[],
  send: typeof fetch = fetch,
): Promise<string | null> {
  const attempt = readAttempt(storage);
  if (!attempt || attempt.cartKey === cartKey(items)) return null;

  const response = await send("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Existing orders retain their frozen cart. If the first POST never arrived,
    // the server uses today's valid cart to reserve and retire the old UUID.
    body: JSON.stringify({ action: "retire", checkoutId: attempt.checkoutId, items }),
  });
  const result = await response.json() as {
    code?: string; checkoutId?: string; paymentPath?: string; error?: string;
  };
  if (response.status === 409 && result.code === "CHECKOUT_ENDED" && result.checkoutId === attempt.checkoutId) {
    forgetAttempt(storage, attempt.checkoutId);
    return null;
  }
  if (response.ok && result.paymentPath) return result.paymentPath;
  // Preserve retry identity on all unknown outcomes, including network failures.
  throw new Error(result.error ?? "We couldn’t close your previous checkout. Please try again.");
}
