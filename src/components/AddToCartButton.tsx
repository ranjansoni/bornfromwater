"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCartButton({
  slug,
  variant = "primary",
}: {
  slug: string;
  variant?: "primary" | "text";
}) {
  const { addItem, getProduct } = useCart();
  const [added, setAdded] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const product = getProduct(slug);
  const productName = product?.name ?? "Item";
  const available = product?.active && !product.placeholder;

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  function handleAdd() {
    addItem(slug);
    setAdded(true);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      disabled={!available}
      onClick={handleAdd}
      aria-label={`${added ? "Added" : "Add"} ${productName} to cart`}
      className={
        variant === "primary"
          ? "w-full bg-accent px-5 py-[14px] text-left text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase transition-colors hover:bg-accent-600"
          : "text-[12px] font-extrabold tracking-[0.12em] text-accent-700 uppercase hover:text-accent hover:underline"
      }
    >
      {!available ? 'Unavailable' : added ? "Added ✓" : variant === "primary" ? "Add to cart" : "Add to cart →"}
    </button>
  );
}
