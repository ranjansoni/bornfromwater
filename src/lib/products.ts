export type Collection = "signature" | "tide";

export type ProductImage = {
  /** Public path, e.g. /products/peridot/01.jpg */
  src: string;
  /** `photo` = real product photography. `graphic` = branded Etsy info slide. */
  kind: "photo" | "graphic";
};

/**
 * The piece's own story — why it exists and how it is meant to be worn.
 * Sits between the name and the price, and stands in for `description` on the
 * page. `description` is still the source for metadata and JSON-LD.
 *
 * This copy is written for the brand, not taken from the owner's Etsy words
 * like the rest of the site. Every story needs the owner's sign-off, and none
 * of them should assert biographical facts.
 */
export type Story = {
  title: string;
  paragraphs: string[];
};

export type Product = {
  slug: string;
  active: boolean;
  name: string;
  collection: Collection;
  stone: string;
  /** Display string including currency. */
  price: string;
  /** Authoritative server-side unit price in Canadian cents. */
  priceCents: number;
  /** Stable internal SKU used to reconcile catalogue items with orders. */
  sku: string;
  blurb: string;
  description: string;
  /** Absent until the piece has an approved story. */
  story?: Story;
  meaning: string;
  images: ProductImage[];
  placeholder: boolean;
};


export const TIDE_LIVE = true;

/** The card image: first real photograph, never an info graphic. */
export function cardImage(p: Product): ProductImage | undefined {
  return p.images.find((i) => i.kind === "photo") ?? p.images[0];
}

export const collectionLabel: Record<Collection, string> = {
  signature: "Signature",
  tide: "Tide",
};

export function formatCad(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

/** Escape editable copy before embedding JSON in a script element. */
export const productJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
