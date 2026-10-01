import { getPublicCatalog } from "@/lib/catalog-store";
export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { TIDE_LIVE } from "@/lib/products";

const BASE = "https://bornfromwater.ca";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const liveProducts = await getPublicCatalog();
  const staticRoutes = [
    "",
    "/about",
    "/care",
    "/collections/signature",
    ...(TIDE_LIVE ? ["/collections/tide"] : []),
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...liveProducts.map((p) => ({
      url: `${BASE}/shop/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
