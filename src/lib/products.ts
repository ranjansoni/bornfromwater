import raw from "@/data/products.json";
import images from "@/data/images.json";

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
  name: string;
  collection: Collection;
  stone: string;
  /** Display-only string including currency. Never parse or convert it. */
  price: string;
  blurb: string;
  description: string;
  /** Absent until the piece has an approved story. */
  story?: Story;
  meaning: string;
  etsyUrl: string;
  images: ProductImage[];
  placeholder: boolean;
};

type RawProduct = Omit<Product, "images" | "placeholder" | "story"> & {
  images: string[];
  placeholder?: boolean;
  story?: Story;
};

const imageMap = images as Record<
  string,
  { file: string; kind: "photo" | "graphic" }[]
>;

export const products: Product[] = (raw as RawProduct[]).map((p) => ({
  ...p,
  placeholder: p.placeholder ?? false,
  images: (imageMap[p.slug] ?? []).map((i) => ({
    src: `/products/${p.slug}/${i.file}`,
    kind: i.kind,
  })),
}));

/** Tide is public with named placeholder listings until photography arrives. */
export const TIDE_LIVE = true;

/** Products safe to show in public listings. */
export const liveProducts = products.filter(
  (p) => TIDE_LIVE || p.collection !== "tide",
);

export function byCollection(collection: Collection | "all"): Product[] {
  if (collection === "all") return liveProducts;
  return liveProducts.filter((p) => p.collection === collection);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** The card image: first real photograph, never an info graphic. */
export function cardImage(p: Product): ProductImage | undefined {
  return p.images.find((i) => i.kind === "photo") ?? p.images[0];
}

export function relatedProducts(current: Product, count = 3): Product[] {
  return liveProducts.filter((p) => p.slug !== current.slug).slice(0, count);
}

export const collectionLabel: Record<Collection, string> = {
  signature: "Signature",
  tide: "Tide",
};

export const ETSY_SHOP = "https://www.etsy.com/ca/shop/BornFromWater";
