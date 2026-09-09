"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCartButton({ slug }: { slug: string }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        addItem(slug);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className="w-full bg-accent px-5 py-[14px] text-left text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase transition-colors hover:bg-accent-600"
    >
      {added ? "Added to cart" : "Add to cart"}
    </button>
  );
}
