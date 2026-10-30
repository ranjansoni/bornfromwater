"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cardImage, formatCad, type Collection, type Product } from "@/lib/products";

type Filter = Collection | "all";
const featuredProductSlugs = ["pearl-drift", "still-within"];
const newProductSlugs = [...featuredProductSlugs, "sole"];

const headings: Record<Filter, string> = {
  all: "All pieces",
  signature: "Signature Collection",
  tide: "Tide Collection",
};

export function ProductCard({ product, showFullImage = false }: { product: Product; showFullImage?: boolean }) {
  const img = cardImage(product);
  const isNew = newProductSlugs.includes(product.slug) && product.active && !product.placeholder;

  return (
    <article className="flex flex-col">
      <Link
        href={`/shop/${product.slug}`}
        className="relative block aspect-4/5 w-full overflow-hidden bg-surface"
      >
        {img ? (
          <Image
            src={img.src}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={showFullImage ? (product.slug === "sole" ? "object-cover p-5" : "object-contain p-5") : "object-cover"}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-accent-100 px-6 text-center">
            <span className="text-[11px] tracking-[0.18em] text-accent-700 uppercase">
              Born From Water · Tide
            </span>
            <span className="text-[22px] font-extrabold tracking-[-0.02em]">
              Photography coming soon
            </span>
          </div>
        )}
        {isNew && (
          <span className="absolute top-4 left-4 bg-accent px-3 py-2 text-[11px] font-extrabold tracking-[0.12em] text-sand uppercase">
            NEW
          </span>
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

      <p className="mt-2 text-[16px] font-bold">{formatCad(product.priceCents)} CAD</p>
      <p className="mt-2 mb-4 text-[14px] text-mid">{product.blurb}</p>

      <div className="rule-t mt-auto flex justify-end pt-2.5">
        <Link
          href={`/shop/${product.slug}`}
          className="text-[12px] font-extrabold tracking-[0.12em] text-accent-700 uppercase hover:text-accent hover:underline"
        >
          View details →
        </Link>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  filterable = false,
  initialFilter = "all",
  heading,
  showFullImages = false,
}: {
  products: Product[];
  filterable?: boolean;
  initialFilter?: Filter;
  heading?: string;
  showFullImages?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const shown = filterable
    ? filter === "all"
      ? products
      : products.filter((p) => p.collection === filter)
    : products;
  const featured = featuredProductSlugs.flatMap((slug) => shown.filter((product) => product.slug === slug));
  const ordered = [...featured, ...shown.filter((product) => !featuredProductSlugs.includes(product.slug))];

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
        {ordered.map((p) => (
          <ProductCard key={p.slug} product={p} showFullImage={showFullImages} />
        ))}
      </div>
    </section>
  );
}
