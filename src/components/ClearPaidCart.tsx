"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { forgetAttempt, readAttempt, shouldClearPaidCart } from "@/lib/checkout-attempt";

export function ClearPaidCart({ checkoutId }: { checkoutId: string }) {
  const { clearCart, items, ready } = useCart();
  useEffect(() => {
    if (!ready) return;
    try {
      const attempt = readAttempt(sessionStorage);
      if (shouldClearPaidCart(attempt, checkoutId, items)) clearCart();
      forgetAttempt(sessionStorage, checkoutId);
    } catch { /* Preserve the cart when storage is unavailable or damaged. */ }
  }, [checkoutId, clearCart, items, ready]);
  return null;
}
