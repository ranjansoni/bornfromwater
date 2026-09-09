"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

export function ClearPaidCart() {
  const { clearCart } = useCart();
  useEffect(() => {
    clearCart();
    sessionStorage.removeItem("bfw-checkout-attempt");
  }, [clearCart]);
  return null;
}
