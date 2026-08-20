"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cardImage, type Collection, type Product } from "@/lib/products";

type Filter = Collection | "all";

const headings: Record<Filter, string> = {
  all: "All pieces",
  signature: "Signature Collection",
  tide: "Tide Collection",
};

export function ProductCard({ product }: { product: Product }) {
  const img = cardImage(product);

  return (
    <article className="flex flex-col">
      <Link
        href={`/shop/${product.slug}`}
        className="relative block aspect-4/5 w-full overflow-hidden bg-surface"
      >
        {img && (
          <Image
            src={img.src}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        )}
      </Link>

      <p className="mt-4 text-[11px] tracking-[0.14em] text-accent-700 uppercase">
        {product.stone}
      </p>

      <h3 className="mt-1.5 text-[19px] leading-[1.2] font-extrabold tracking-[-0.015em]">
        <Link href={`/shop/${product.slug}`} className="hover:text-accent">
          {product.name}
        </Link>
      </h3>

      <p className="mt-2 text-[14px] text-mid">{product.blurb}</p>

      {/* margin-top:auto keeps every price rule aligned across a row,
          regardless of how long the blurb runs. */}
      <div className="rule-t mt-auto flex items-center justify-between gap-4 pt-2.5">
        <span className="text-[16px] font-extrabold">{product.price}</span>
        <a
          href={product.etsyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-extrabold tracking-[0.12em] text-accent-700 uppercase hover:text-accent hover:underline"
        >
          Buy on Etsy →
        </a>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  filterable = false,
  initialFilter = "all",
  heading,
}: {
  products: Product[];
  filterable?: boolean;
  initialFilter?: Filter;
  heading?: string;
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const shown = filterable
    ? filter === "all"
      ? products
      : products.filter((p) => p.collection === filter)
    : products;

  const chips: Filter[] = ["all", "signature", "tide"];

  return (
    <section className="rule-b px-6 py-14 md:px-12">
      <div className="rule-b flex flex-wrap items-end justify-between gap-6 pb-5">
        <h2 className="text-[28px] font-extrabold tracking-[-0.025em] md:text-[40px]">
          {heading ?? headings[filter]}
        </h2>

        {filterable && (
          <div className="flex border-2 border-divider">
            {chips.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                aria-pressed={filter === c}
                className={`px-[18px] py-2.5 text-[12px] font-extrabold tracking-[0.12em] uppercase transition-colors ${
                  i > 0 ? "border-l-2 border-divider" : ""
                } ${
                  filter === c
                    ? "bg-ink text-sand"
                    : "bg-transparent text-ink hover:bg-surface"
                }`}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-10 pt-10 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
