import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductGrid";
import { getPublicCatalog } from "@/lib/catalog-store";

export const metadata: Metadata = {
  title: "Tide Collection",
  description:
    "Gemstone and freshwater pearl bracelets inspired by the movement and colour of the sea.",
};

export default async function TideCollection() {
  const products = (await getPublicCatalog()).filter(p => p.collection === "tide");
  return (
    <>
      <section className="rule-b px-6 pt-16 pb-11 md:px-12">
        <p className="text-[12px] tracking-[0.16em] text-mid uppercase">
          Collection 02 · {products.length} pieces
        </p>
        <h1 className="mt-4 max-w-[14ch] text-[44px] leading-none font-extrabold tracking-[-0.035em] md:text-[70px]">
          Tide
        </h1>
        <p className="mt-6 max-w-[52ch] text-[19px] leading-[1.5] text-mid">
          Gemstones and freshwater pearls inspired by the movement and colour
          of the sea.
        </p>
      </section>

      <ProductGrid products={products} heading="The pieces" />
    </>
  );
}
