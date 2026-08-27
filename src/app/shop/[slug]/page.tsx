import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import {
  cardImage,
  collectionLabel,
  getProduct,
  products,
  relatedProducts,
  TIDE_LIVE,
} from "@/lib/products";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products
    .filter((p) => TIDE_LIVE || p.collection !== "tide")
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};

  const img = cardImage(product);
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: img ? [img.src] : undefined,
    },
    robots: product.placeholder ? { index: false, follow: false } : undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();
  if (product.collection === "tide" && !TIDE_LIVE) notFound();

  const [primary, ...rest] = product.images;
  const related = relatedProducts(product);

  const specs = [
    { label: "Metal", value: "14k gold-filled" },
    { label: "Stone", value: `${product.stone}, genuine` },
    {
      label: "Sizing",
      value:
        "Made to your wrist measurement — add it to the Etsy order note",
    },
    { label: "Ships from", value: "Vancouver, British Columbia" },
  ];

  // JSON-LD points offers at the Etsy listing — that is where the pieces sell.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images
      .filter((i) => i.kind === "photo")
      .map((i) => `https://bornfromwater.ca${i.src}`),
    brand: { "@type": "Brand", name: "Born From Water" },
    material: "14k gold-filled",
    offers: {
      "@type": "Offer",
      url: product.etsyUrl,
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="rule-b px-6 py-[18px] text-[12px] tracking-[0.12em] text-mid uppercase md:px-12"
      >
        <Link href="/" className="text-accent-700 hover:underline">
          Shop
        </Link>
        {" / "}
        {collectionLabel[product.collection]}
        {" / "}
        {product.stone}
      </nav>

      <section className="rule-b grid grid-cols-1 md:grid-cols-2">
        {/* Gallery — every image from the Etsy listing, in listing order. */}
        <div className="md:rule-r">
          {primary ? (
            <div className="rule-b relative aspect-square w-full overflow-hidden bg-surface">
              <Image
                src={primary.src}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="rule-b flex aspect-square w-full flex-col items-center justify-center gap-3 bg-accent-100 px-6 text-center">
              <span className="text-[11px] tracking-[0.18em] text-accent-700 uppercase">
                Born From Water · Tide
              </span>
              <span className="text-[26px] font-extrabold tracking-[-0.02em]">
                Photography coming soon
              </span>
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-3">
              {rest.map((img, i) => (
                <div
                  key={img.src}
                  className={`relative aspect-square w-full overflow-hidden bg-surface ${
                    i % 3 !== 0 ? "rule-l" : ""
                  } ${i >= 3 ? "rule-t" : ""}`}
                >
                  <Image
                    src={img.src}
                    alt={
                      img.kind === "photo"
                        ? `${product.name} — view ${i + 2}`
                        : `${product.name} — product information`
                    }
                    fill
                    sizes="(max-width: 768px) 33vw, 17vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Galleries run 9–14 images deep, so the buy panel sticks rather than
            stranding the reader beside a column of photographs. */}
        <div className="flex flex-col items-start gap-5 px-6 py-13 md:sticky md:top-0 md:self-start md:px-12">
          <p className="text-[11px] tracking-[0.14em] text-accent-700 uppercase">
            {product.stone}
          </p>
          <h1 className="max-w-[20ch] text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[44px]">
            {product.name}
          </h1>
          {/* The story leads — why the piece exists — before any spec detail.
              It stands in for `description`, which still feeds metadata. */}
          {product.story ? (
            <div className="rule-t w-full pt-5">
              <p className="text-[13px] font-extrabold tracking-[0.12em] uppercase">
                The story
              </p>
              <h2 className="mt-3 max-w-[24ch] text-[22px] font-extrabold tracking-[-0.02em]">
                {product.story.title}
              </h2>
              {product.story.paragraphs.map((para) => (
                <p
                  key={para.slice(0, 24)}
                  className="mt-3 max-w-[52ch] text-[16px] leading-[1.65]"
                >
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p className="max-w-[52ch] text-[16px] leading-[1.6]">
              {product.description}
            </p>
          )}

          <dl className="rule-t w-full">
            {specs.map((s, i) => (
              <div
                key={s.label}
                className={`grid grid-cols-1 gap-4 py-3 sm:grid-cols-[170px_1fr] ${
                  i < specs.length - 1
                    ? "border-b border-surface"
                    : "rule-b"
                }`}
              >
                <dt className="text-[11px] tracking-[0.1em] text-mid uppercase">
                  {s.label}
                </dt>
                <dd className="text-[14px]">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="w-full">
            {product.placeholder ? (
              <p className="border-2 border-divider bg-surface px-5 py-[14px] text-[13px] font-extrabold tracking-[0.08em] uppercase">
                Etsy listing coming soon
              </p>
            ) : (
              <>
                {/* Label stays flush left — Modernist rule, do not centre it. */}
                <Button
                  href={product.etsyUrl}
                  className="w-full px-5 py-[14px]"
                >
                  Buy on Etsy
                </Button>
                <p className="mt-3 text-[13px] text-mid">
                  Checkout, payment and delivery are handled by Etsy.
                </p>
              </>
            )}
          </div>

          <div className="rule-t w-full pt-5">
            <p className="text-[13px] font-extrabold tracking-[0.12em] uppercase">
              The stone
            </p>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-mid">
              {product.meaning}
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-6 py-13 md:px-12">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">
            More from the shop
          </h2>
          <div className="grid grid-cols-1 gap-7 pt-8 sm:grid-cols-3">
            {related.map((p) => {
              const img = cardImage(p);
              return (
                <Link key={p.slug} href={`/shop/${p.slug}`} className="group">
                  <div className="relative aspect-square w-full overflow-hidden bg-surface">
                    {img && (
                      <Image
                        src={img.src}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <h3 className="mt-3 text-[16px] font-extrabold group-hover:text-accent">
                    {p.name}
                  </h3>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export const dynamicParams = false;
