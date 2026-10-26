import { getPublicCatalog } from "@/lib/catalog-store";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";
import { shippingConfiguration } from "@/lib/shipping-config";
import {
  cardImage,
  collectionLabel,
  formatCad,
  productJsonLd,
  TIDE_LIVE,
} from "@/lib/products";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const products = await getPublicCatalog();
  const product = products.find(p => p.slug === slug);
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
  const products = await getPublicCatalog();
  const product = products.find(p => p.slug === slug);

  if (!product) notFound();
  if (product.collection === "tide" && !TIDE_LIVE) notFound();

  const related = products.filter(p => p.slug !== slug).slice(0, 3);
  const story = product.story;
  const storyParagraphCount = story?.paragraphs.length ?? 0;
  const { shippingCents, complimentaryShipping, automaticTax } = shippingConfiguration();

  const specs = [
    { label: "Metal", value: "Genuine 14K Gold-Filled — Not Gold-Plated" },
    ...(product.slug === "pearl-drift"
      ? [
          { label: "Pearls", value: "High Quality Natural Genuine Freshwater Round 5mm" },
        ]
      : product.slug === "still-within"
      ? [
          { label: "Charm", value: "14k gold-filled, shell-inspired" },
          { label: "Pearl", value: "One pearl" },
          { label: "Chain & clasp", value: "14k gold-filled" },
        ]
      : [
          { label: "Stone", value: `${product.stone}, genuine` },
        ]),
    {
      label: "Sizing",
      value: "Adjustable length",
    },
  ];

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
      url: `https://bornfromwater.ca/shop/${product.slug}`,
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "CAD",
      availability: product.placeholder ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
    },
  };

  const storySection = story ? (
    <div className="rule-t w-full pt-5">
      <p className="text-[13px] font-extrabold tracking-[0.12em] uppercase">The story</p>
      <h2 className="mt-3 max-w-[24ch] text-[22px] font-extrabold tracking-[-0.02em]">
        {story.title}
      </h2>
      {story.paragraphs.map((para, index) => {
        const isStillWithin = product.slug === "still-within";
        const isPearlDrift = product.slug === "pearl-drift";
        const italic = (isStillWithin || isPearlDrift) && index === 0;
        const bold = isStillWithin && index === 1 ||
          isPearlDrift && index === storyParagraphCount - 1;
        const [beforeName, afterName] = para.split("Pearl Drift");

        return (
          <p
            key={para.slice(0, 24)}
            className={`mt-3 max-w-[52ch] text-[16px] leading-[1.65] ${italic ? "italic" : bold ? "font-extrabold" : ""}`}
          >
            {isStillWithin && index === 2
              ? <><em>Still Within</em>{para.slice("Still Within".length)}</>
              : isPearlDrift && index === 3 && afterName !== undefined
              ? <>{beforeName}<strong>Pearl Drift</strong>{afterName}</>
              : para}
          </p>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd(jsonLd) }}
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
        {/* Gallery — every approved product image in catalogue order. */}
        <ProductGallery key={product.slug} name={product.name} images={product.images} />

        {/* Galleries run 9–14 images deep, so the buy panel sticks rather than
            stranding the reader beside a column of photographs. */}
        <div className="flex flex-col items-start gap-5 px-6 py-13 md:sticky md:top-0 md:self-start md:px-12">
          <p className="text-[11px] tracking-[0.14em] text-accent-700 uppercase">
            {product.stone}
          </p>
          <h1 className="max-w-[20ch] text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[44px]">
            {product.name}
          </h1>
          {product.slug === "pearl-drift" && (
            <div className="max-w-[52ch]">
              <p className="text-[12px] font-extrabold tracking-[0.12em] text-accent-700 uppercase">
                Inspired by the tide
              </p>
              <p className="mt-3 text-[16px] leading-[1.65]">{product.description}</p>
            </div>
          )}
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <p className="text-[24px] font-extrabold">{formatCad(product.priceCents)} CAD</p>
              {product.placeholder ? (
                <p className="border-2 border-divider bg-surface px-5 py-[14px] text-[13px] font-extrabold tracking-[0.08em] uppercase">
                  Available soon
                </p>
              ) : (
                <AddToCartButton slug={product.slug} />
              )}
            </div>
            <p className="mt-4 text-[14px] font-bold">
              {complimentaryShipping ? "Complimentary shipping within Canada for a limited time." : `${formatCad(shippingCents)} CAD flat shipping within Canada.`}
            </p>
            <p className="mt-1 text-[13px] leading-[1.6] text-mid">
              Handcrafted to order. Ships within 3–5 business days.
              {automaticTax && " Any applicable tax is calculated at payment."}
              {" Secure payment with Stripe."}
            </p>
          </div>
          {product.slug === "pearl-drift" && (
            <p className="max-w-[52ch] text-[14px] leading-[1.6] text-mid">
              Pearl care: wipe gently after wear and store dry.
            </p>
          )}
          {/* Product story and details follow the purchase information. */}
          {product.slug !== "pearl-drift" && (storySection ?? (
            <p className="max-w-[52ch] text-[16px] leading-[1.6]">
              {product.description}
            </p>
          ))}

          <dl className="rule-t w-full">
            {specs.map((s, i) => (
              <div
                key={s.label}
                className={`grid grid-cols-1 py-3 sm:grid-cols-[170px_1fr] ${product.slug === "pearl-drift" ? "gap-2" : "gap-4"} ${
                  i < specs.length - 1
                    ? "border-b border-surface"
                    : product.slug === "pearl-drift" ? "" : "rule-b"
                }`}
              >
                <dt className={`tracking-[0.1em] text-mid uppercase ${product.slug === "pearl-drift" ? "text-[12px]" : "text-[11px]"}`}>
                  {s.label}
                </dt>
                <dd className={product.slug === "pearl-drift" ? "text-[18px] leading-snug" : "text-[14px]"}>
                  {s.value}
                  {s.label === "Sizing" && (
                    <Link
                      href="/care#wrist-measurement"
                      className="mt-2 block text-[13px] font-bold text-accent-700 underline underline-offset-2 hover:text-accent"
                    >
                      Wrist measurement guide →
                    </Link>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {product.slug !== "pearl-drift" && <div className="flex w-full flex-col items-center py-7 text-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 32 30"
              fill="none"
              className="h-8 w-8 text-[#b89554]"
            >
              <path d="M7 3h18l5 8-14 17L2 11l5-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 11h28M7 3l5 8 4 17 4-17 5-8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <p className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.02em] uppercase">
              14K Gold-Filled
            </p>
            <p className="mt-3 text-[20px] leading-snug text-mid">
              Made for lasting beauty
            </p>
          </div>}

          {product.slug !== "still-within" && (product.slug === "pearl-drift" && storySection ? storySection : (
            <div className="rule-t w-full pt-5">
              <p className="text-[13px] font-extrabold tracking-[0.12em] uppercase">
                The stone
              </p>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-mid">
                {product.meaning}
              </p>
            </div>
          ))}
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
                  <p className="mt-2 text-[14px] font-bold">{formatCad(p.priceCents)} CAD</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
