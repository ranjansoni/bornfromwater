import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { ProductGrid } from "@/components/ProductGrid";
import { byCollection, products, TIDE_LIVE } from "@/lib/products";

export const metadata: Metadata = {
  title: "Tide Collection",
  description:
    "Drawn from the movement of water — high tide, low tide, and the line the sea leaves behind.",
  robots: TIDE_LIVE ? undefined : { index: false, follow: false },
};

const concepts = [
  {
    h: "High tide",
    p: "Fuller, layered pieces — more stone, more presence.",
  },
  {
    h: "Low tide",
    p: "Pared back to a single stone and a fine gold-filled chain.",
  },
  {
    h: "Tideline",
    p: "Two stones meeting — the mark left where water turns back.",
  },
];

export default function TideCollection() {
  // Built, but not live: every Tide field is invented and the Etsy links are
  // dead. Flip TIDE_LIVE in lib/products once real data lands.
  if (!TIDE_LIVE) notFound();

  const tide = byCollection("tide");
  const hasPlaceholders = products.some(
    (p) => p.collection === "tide" && p.placeholder,
  );

  return (
    <>
      <section className="horizon-tide rule-b flex min-h-[460px] flex-col justify-end px-6 py-16 text-sand md:px-12">
        <p className="text-[12px] tracking-[0.16em] text-sun uppercase">
          Collection 02 · New
        </p>
        <h1 className="mt-4 text-[56px] leading-[0.92] font-extrabold tracking-[-0.04em] md:text-[96px]">
          Tide
        </h1>
        <p className="mt-6 max-w-[52ch] text-[19px] leading-[1.5]">
          The sea arrives and leaves twice a day and never in the same shape.
          Tide follows that rhythm — pieces built around movement, layered
          stones and the line water draws on the sand.
        </p>
      </section>

      <section className="rule-b grid grid-cols-1 md:grid-cols-3">
        {concepts.map((c, i) => (
          <div
            key={c.h}
            className={`flex flex-col gap-2.5 px-6 py-9 md:px-12 ${
              i > 0 ? "rule-t md:border-t-0 md:rule-l" : ""
            }`}
          >
            <p className="text-[15px] font-extrabold tracking-[0.12em] text-accent-700 uppercase">
              {c.h}
            </p>
            <p className="text-[15px] text-mid">{c.p}</p>
          </div>
        ))}
      </section>

      <ProductGrid products={tide} heading="The pieces" />

      {hasPlaceholders && (
        <p className="rule-b bg-accent-100 px-6 py-4 text-[13px] text-accent-700 md:px-12">
          Placeholder copy — send me the real names and stones.
        </p>
      )}

      <section className="flex flex-wrap items-center justify-between gap-6 px-6 py-12 md:px-12">
        <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">
          Looking for the founding six?
        </h2>
        <Button href="/collections/signature" variant="secondary">
          Back to the Signature collection
        </Button>
      </section>
    </>
  );
}
