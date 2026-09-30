"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cartKey, CHECKOUT_ATTEMPT_KEY, forgetAttempt, readAttempt } from "@/lib/checkout-attempt";
import { useCart } from "@/components/CartProvider";
import { cardImage, formatCad } from "@/lib/products";

export function CartView({ checkout = false }: { checkout?: boolean }) {
  const { items, lines, totalCents, ready, setQuantity, removeItem } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [endedAttempt, setEndedAttempt] = useState<string | null>(null);
  const [previousCart, setPreviousCart] = useState(false);

  async function beginPayment(resumePrevious = false) {
    setSubmitting(true);
    setError("");

    try {
      const stored = readAttempt(sessionStorage);
      if (stored && stored.cartKey !== cartKey(items) && !resumePrevious) {
        setPreviousCart(true);
        throw new Error("You have a previous checkout for a different selection. Review it before starting another payment.");
      }
      const checkoutId = stored?.checkoutId ?? crypto.randomUUID();
      sessionStorage.setItem(
        CHECKOUT_ATTEMPT_KEY,
        JSON.stringify({ cartKey: stored?.cartKey ?? cartKey(items), checkoutId }),
      );

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: stored ? JSON.parse(stored.cartKey) : items, checkoutId }),
      });
      const result = (await response.json()) as { paymentPath?: string; error?: string; code?: string; checkoutId?: string };
      if (result.code === "CHECKOUT_ENDED" && result.checkoutId === checkoutId) setEndedAttempt(checkoutId);
      if (!response.ok || !result.paymentPath) {
        throw new Error(result.error ?? "Checkout could not be started.");
      }
      window.location.assign(result.paymentPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be started.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <p className="px-6 py-16 text-mid md:px-12">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <section className="px-6 py-16 md:px-12">
        <h1 className="text-[38px] font-extrabold tracking-[-0.03em]">Your cart is empty.</h1>
        <Link
          href="/"
          className="mt-7 inline-flex bg-accent px-[22px] py-[14px] text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase hover:bg-accent-600"
        >
          Browse the shop
        </Link>
      </section>
    );
  }

  return (
    <section className="px-6 py-12 md:px-12 md:py-16">
      <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
        {checkout ? "Checkout" : "Your selection"}
      </p>
      <h1 className="mt-3 text-[38px] font-extrabold tracking-[-0.03em] md:text-[54px]">
        {checkout ? "Review your order." : "Your cart."}
      </h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="rule-t">
          {lines.map(({ product, quantity }) => {
            const image = cardImage(product);
            return (
              <article
                key={product.slug}
                className="rule-b grid grid-cols-[96px_1fr] gap-5 py-5 sm:grid-cols-[128px_1fr_auto]"
              >
                <Link
                  href={`/shop/${product.slug}`}
                  className="relative aspect-square overflow-hidden bg-surface"
                >
                  {image && (
                    <Image src={image.src} alt="" fill sizes="128px" className="object-cover" />
                  )}
                </Link>
                <div>
                  <h2 className="text-[18px] font-extrabold">{product.name}</h2>
                  <p className="mt-1 text-[13px] text-mid">{product.sku}</p>
                  <p className="mt-2 text-[14px]">{formatCad(product.priceCents)}</p>
                  {!checkout && (
                    <div className="mt-4 flex items-center gap-3">
                      <label htmlFor={`quantity-${product.slug}`} className="text-[12px] uppercase">
                        Qty
                      </label>
                      <input
                        id={`quantity-${product.slug}`}
                        type="number"
                        min="1"
                        max="10"
                        value={quantity}
                        onChange={(event) => setQuantity(product.slug, Number(event.target.value))}
                        className="w-16 border-2 border-divider bg-transparent px-2 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(product.slug)}
                        className="text-[12px] text-accent-700 underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <p className="col-start-2 text-[15px] font-extrabold sm:col-start-auto">
                  {formatCad(product.priceCents * quantity)}
                </p>
              </article>
            );
          })}
        </div>

        <aside className="h-fit border-2 border-divider p-6">
          <div className="flex justify-between gap-4 text-[18px] font-extrabold">
            <span>Subtotal</span>
            <span>{formatCad(totalCents)} CAD</span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.55] text-mid">
            Pay securely with Stripe. Shipping and any applicable tax are shown before you pay. All prices are in CAD.
          </p>
          {error && (
            <p role="alert" className="mt-5 border-2 border-accent bg-accent-100 p-3 text-[13px]">
              {error}
            </p>
          )}
          {previousCart && !endedAttempt && (
            <button type="button" disabled={submitting} onClick={() => beginPayment(true)} className="mt-4 text-accent-700 underline">
              Review previous checkout
            </button>
          )}
          {endedAttempt && (
            <button type="button" onClick={() => {
              forgetAttempt(sessionStorage, endedAttempt);
              setEndedAttempt(null);
              setPreviousCart(false);
              setError("");
              void beginPayment();
            }} className="mt-4 text-accent-700 underline">
              Start a new checkout
            </button>
          )}
          {checkout ? (
            <button
              type="button"
              onClick={() => beginPayment()}
              disabled={submitting}
              className="mt-6 w-full bg-accent px-5 py-[14px] text-left text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase hover:bg-accent-600 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Preparing secure payment…" : "Continue to payment"}
            </button>
          ) : (
            <Link
              href="/checkout"
              className="mt-6 block bg-accent px-5 py-[14px] text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase hover:bg-accent-600"
            >
              Checkout
            </Link>
          )}
          {checkout && (
            <Link href="/cart" className="mt-4 block text-[12px] text-accent-700 underline">
              Return to cart
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
