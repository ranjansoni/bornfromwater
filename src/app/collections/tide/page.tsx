import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductGrid";
import { byCollection } from "@/lib/products";

export const metadata: Metadata = {
  title: "Tide Collection",
  description:
    "Three gemstone bracelets inspired by the movement and colour of the sea: Peridot Tide, Aquamarine Tide, and Amethyst Tide.",
};

export default function TideCollection() {
  return (
    <>
      <section className="rule-b px-6 pt-16 pb-11 md:px-12">
        <p className="text-[12px] tracking-[0.16em] text-mid uppercase">
          Collection 02 · Three pieces
        </p>
        <h1 className="mt-4 max-w-[14ch] text-[44px] leading-none font-extrabold tracking-[-0.035em] md:text-[70px]">
          Tide
        </h1>
        <p className="mt-6 max-w-[52ch] text-[19px] leading-[1.5] text-mid">
          Three gemstone bracelets inspired by the movement and colour of the
          sea: Peridot Tide, Aquamarine Tide, and Amethyst Tide.
        </p>
      </section>

      <ProductGrid products={byCollection("tide")} heading="The pieces" />
    </>
  );
}
