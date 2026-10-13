"use client";
import { BRACELET_SIZES, DEFAULT_SIZE, isBraceletSize, sizeLabel, type BraceletSize } from "@/lib/bracelet-sizes";


import { useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCartButton({
  slug,
  variant = "primary",
}: {
  slug: string;
  variant?: "primary" | "text";
}) {
  const { addItem, getProduct, purchaseEligibility } = useCart();
  const sizeId = useId();
  const [size, setSize] = useState<BraceletSize>(DEFAULT_SIZE);
  const [added, setAdded] = useState(false);
  const [checking, setChecking] = useState(false);
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

  async function handleAdd() {
    setChecking(true);
    const added = await addItem(slug, size);
    setChecking(false);
    if (!added) return;
    setAdded(true);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="w-full space-y-3">
      <label htmlFor={sizeId} className="block text-[12px] font-bold tracking-[0.08em] uppercase">Bracelet sizing</label>
      <select id={sizeId} value={size} disabled={checking} aria-label={`Bracelet size for ${productName}`}
        onChange={event => { if (isBraceletSize(event.target.value)) { setSize(event.target.value); setAdded(false); } }}
        className="min-h-11 w-full border-2 border-divider bg-sand px-3 py-2 text-[14px]">
        {BRACELET_SIZES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    <button
      type="button"
      disabled={!available || !purchaseEligibility.allowed || checking}
      onClick={handleAdd}
      aria-label={!purchaseEligibility.allowed ? `${productName} — shopping available only in Canada` : `${added ? "Added" : "Add"} ${productName}, ${sizeLabel(size)} to cart`}
      className={
        variant === "primary"
          ? "w-full bg-accent px-5 py-[14px] text-left text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
          : "text-[12px] font-extrabold tracking-[0.12em] text-accent-700 uppercase hover:text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {!available ? 'Unavailable' : !purchaseEligibility.allowed ? 'Canada only' : checking ? 'Checking…' : added ? "Added ✓" : variant === "primary" ? "Add to cart" : "Add to cart →"}
    </button>
    </div>
  );
}
