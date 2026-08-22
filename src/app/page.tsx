import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ProductGrid } from "@/components/ProductGrid";
import { ETSY_SHOP, liveProducts, TIDE_LIVE } from "@/lib/products";

const stats = [
  { n: "14k", label: "Gold-filled" },
  { n: "Waterproof", label: "Everyday wear" },
  { n: "Vancouver", label: "Made by hand" },
];

const care = [
  {
    kicker: "01 — Materials",
    h: "14k gold-filled, not plated",
    p: "A bonded layer of solid gold over brass — thicker than plating, made to hold its colour through daily wear.",
  },
  {
    kicker: "02 — Water",
    h: "Wear it in the shower and the sea",
    p: "Waterproof by design. Rinse in fresh water after salt or chlorine and dry with a soft cloth.",
  },
  {
    kicker: "03 — Care",
    h: "Keep it away from chemicals",
    p: "Put jewellery on last, after perfume and lotion. Store flat and dry, away from direct sun.",
  },
];

/** Only one review exists so far — flip to hide the whole section. */
const SHOW_REVIEW = true;

export default function Home() {
  return (
    <>
      <section className="horizon-hero rule-b relative max-h-[720px] min-h-[220px] w-full overflow-hidden aspect-video">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/site/shop-banner.jpg"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/site/homepage-banner.mp4" type="video/mp4" />
        </video>
      </section>

      <section className="rule-b">
        <div className="flex flex-col items-start gap-[22px] px-6 py-14 md:px-12 md:pt-18 md:pb-14">
          <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
            Handcrafted gold-filled gemstone bracelets
          </p>
          <h1 className="max-w-[12ch] text-[44px] leading-[0.96] font-extrabold tracking-[-0.035em] md:text-[78px]">
            Wear your story.
          </h1>
          <p className="max-w-[46ch] text-[18px] leading-[1.5]">
            Inspired by the ocean. Handcrafted with purpose. Made to be worn
            every day — genuine gemstones on 14k gold-filled, finished by hand
            in Vancouver, Canada.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href={ETSY_SHOP}>Shop the collections</Button>
            {TIDE_LIVE && (
              <Button href="/collections/tide" variant="secondary">
                See Tide, new
              </Button>
            )}
          </div>
          <div className="rule-t flex w-full flex-wrap gap-10 pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-[22px] font-extrabold">{s.n}</p>
                <p className="mt-1 text-[11px] tracking-[0.12em] text-mid uppercase">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {TIDE_LIVE && (
        <div className="flex flex-nowrap items-center gap-[18px] bg-deep px-6 py-[18px] text-foam md:px-12">
          <span className="shrink-0 text-[13px] font-extrabold tracking-[0.18em] uppercase">
            New — the Tide collection
          </span>
          <span className="h-0.5 grow bg-foam/40" aria-hidden />
          <Link
            href="/collections/tide"
            className="shrink-0 text-[13px] font-extrabold tracking-[0.18em] text-sun uppercase hover:underline"
          >
            View the collection →
          </Link>
        </div>
      )}

      {/* Lead with the brand story before introducing collections or products.
          Image first on mobile; the photograph sticks on desktop because the
          story copy is intentionally longer than the image panel. */}
      <section className="rule-b grid grid-cols-1 md:grid-cols-[1fr_1.1fr]">
        <div className="relative w-full min-w-0 md:rule-r">
          <div className="relative min-h-[500px] w-full overflow-hidden md:sticky md:top-0 md:h-[760px] md:min-h-0">
            <Image
              src="/site/story-bracelets.png"
              alt="Born From Water gemstone bracelets arranged on coral rock beside the ocean"
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-5 px-6 py-14 md:px-12 md:py-16">
          <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
            The story
          </p>
          <h2 className="max-w-[20ch] text-[32px] font-extrabold tracking-[-0.025em] md:text-[42px]">
            Born from water. Shaped by nature. Made to be worn.
          </h2>

          <p className="max-w-[56ch] text-[18px] leading-[1.6]">
            Born From Water is a collection inspired by the quiet power of the
            ocean — its movement, its textures, and the way it shapes everything
            it touches.
          </p>
          <p className="max-w-[56ch] text-[16px] leading-[1.65] text-mid">
            The concept began with a simple idea: to create pieces that feel as
            though they have been discovered rather than designed. Forms that
            carry the irregularity of shells, stones, coral and surfaces
            softened by water; organic shapes that resist perfect symmetry and
            celebrate the beauty of what feels natural and unexpected.
          </p>
          <p className="max-w-[56ch] text-[16px] leading-[1.65] text-mid">
            Water is both the beginning and the thread that connects the
            collection. It represents movement, transformation and renewal.
            Nothing in water remains completely still. Edges soften, surfaces
            change, and forms evolve over time. Born From Water translates that
            feeling into pieces that are tactile, sculptural and deeply
            connected to the natural world.
          </p>
          <p className="max-w-[56ch] text-[16px] leading-[1.65] text-mid">
            At the heart of the brand is a belief in{" "}
            <strong className="font-extrabold text-ink">
              beauty with individuality
            </strong>
            . Each piece is designed to have presence without perfection —
            something personal, expressive and a little different from
            everything around it.
          </p>

          <p className="rule-t mt-2 max-w-[44ch] pt-6 text-[22px] leading-[1.35] font-extrabold tracking-[-0.02em] md:text-[26px]">
            Born From Water is more than a collection. It is a return to
            something elemental — a reminder that the most beautiful forms are
            often the ones nature creates on its own.
          </p>

          <Button href="/about" variant="secondary">
            More about the brand
          </Button>
        </div>
      </section>

      {/* Collection split */}
      <section className="rule-b grid grid-cols-1 md:grid-cols-2">
        <Link
          href="/collections/signature"
          className="flex flex-col gap-2 px-6 py-10 transition-colors hover:bg-surface md:px-12 md:rule-r"
        >
          <p className="text-[12px] tracking-[0.16em] text-mid uppercase">
            Collection 01 · Six pieces
          </p>
          <h2 className="text-[34px] font-extrabold tracking-[-0.02em]">
            Signature
          </h2>
          <p className="max-w-[46ch] text-[15px] text-mid">
            The founding line. Single-stone and paired bracelets on 14k
            gold-filled, chosen for meaning as much as colour.
          </p>
        </Link>

        {TIDE_LIVE ? (
          <Link
            href="/collections/tide"
            className="flex flex-col gap-2 bg-accent-100 px-6 py-10 transition-colors hover:bg-[#f7e2d6] md:px-12"
          >
            <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
              Collection 02 · New
            </p>
            <h2 className="text-[34px] font-extrabold tracking-[-0.02em]">
              Tide
            </h2>
            <p className="max-w-[46ch] text-[15px] text-mid">
              Drawn from the movement of water — high tide, low tide, and the
              line the sea leaves behind.
            </p>
          </Link>
        ) : (
          <div className="flex flex-col gap-2 bg-accent-100 px-6 py-10 md:px-12">
            <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
              Collection 02 · Coming soon
            </p>
            <h2 className="text-[34px] font-extrabold tracking-[-0.02em]">
              Tide
            </h2>
            <p className="max-w-[46ch] text-[15px] text-mid">
              Drawn from the movement of water — high tide, low tide, and the
              line the sea leaves behind.
            </p>
          </div>
        )}
      </section>

      <ProductGrid products={liveProducts} filterable={TIDE_LIVE} />

      {/* Care strip */}
      <section className="rule-b grid grid-cols-1 md:grid-cols-3">
        {care.map((c, i) => (
          <div
            key={c.kicker}
            className={`flex flex-col gap-2.5 px-6 py-11 md:px-12 ${
              i > 0 ? "rule-t md:border-t-0 md:rule-l" : ""
            }`}
          >
            <p className="text-[13px] font-extrabold tracking-[0.12em] text-accent-700 uppercase">
              {c.kicker}
            </p>
            <h3 className="text-[21px] font-extrabold">{c.h}</h3>
            <p className="text-[15px] text-mid">{c.p}</p>
          </div>
        ))}
      </section>

      {SHOW_REVIEW && (
        <section className="rule-b grid grid-cols-1 gap-12 px-6 py-17 md:grid-cols-[1fr_2fr] md:px-12">
          <div>
            <p className="text-[12px] tracking-[0.16em] text-mid uppercase">
              Reviews
            </p>
            <p className="mt-4 text-[48px] leading-none font-extrabold">5.0</p>
            <p className="mt-3 text-[13px] text-mid">
              ★★★★★ · Etsy, August 2026
            </p>
          </div>
          <blockquote className="text-[24px] leading-[1.25] font-bold tracking-[-0.02em] md:text-[30px]">
            &ldquo;The quality and fitting of this bracelet was perfect. The
            materials feel premium and the packaging was very nice as well. Will
            definitely be buying again!&rdquo;
          </blockquote>
        </section>
      )}

      {/* Closing banner — the second and final horizon gradient. */}
      <section className="horizon-closing flex flex-col items-start gap-7 px-6 py-16 text-sand md:px-12 md:py-22">
        <h2 className="max-w-[16ch] text-[40px] leading-[0.95] font-extrabold tracking-[-0.035em] md:text-[84px]">
          A gentle reminder of strength, balance and new beginnings.
        </h2>
        <Button href={ETSY_SHOP}>Shop every piece on Etsy →</Button>
      </section>
    </>
  );
}
