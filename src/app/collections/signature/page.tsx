import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductGrid";
import { byCollection } from "@/lib/products";

export const metadata: Metadata = {
  title: "Signature Collection",
  description:
    "The founding line. Single-stone and paired bracelets on 14k gold-filled, chosen for meaning as much as colour.",
};

export default function SignatureCollection() {
  return (
    <>
      <section className="rule-b px-6 pt-16 pb-11 md:px-12">
        <p className="text-[12px] tracking-[0.16em] text-mid uppercase">
          Collection 01 · Six pieces
        </p>
        <h1 className="mt-4 max-w-[14ch] text-[44px] leading-none font-extrabold tracking-[-0.035em] md:text-[70px]">
          Signature
        </h1>
        <p className="mt-6 max-w-[52ch] text-[19px] leading-[1.5] text-mid">
          The founding line. Single-stone and paired bracelets on 14k
          gold-filled, chosen for meaning as much as colour.
        </p>
      </section>

      <ProductGrid
        products={byCollection("signature")}
        heading="The pieces"
      />
    </>
  );
}
