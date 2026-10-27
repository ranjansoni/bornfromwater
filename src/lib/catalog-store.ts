import 'server-only';
import { neon } from '@neondatabase/serverless';
import { cache } from 'react';
import { formatCad, type Product } from './products';
import type { CatalogUpdate } from './catalog-management';

type Query = { query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]> };
export type CatalogProduct = Product & { sortOrder: number; version: number; updatedAt: string };
export class CatalogConflictError extends Error {}
const aquamarineBeforeAddition = [1, 3, 4, 6, 7, 8, 10, 11]
  .map(number => `/products/aquamarine-tide/${String(number).padStart(2, '0')}.jpg`);
const aquamarineNewImages: Product['images'] = [
  { src: '/products/aquamarine-tide/img-8637.jpeg', kind: 'photo' },
  { src: '/products/aquamarine-tide/img-8638.jpeg', kind: 'photo' },
  { src: '/products/aquamarine-tide/flatlay-03.png', kind: 'photo' },
];
function publishedImages(slug: string, images: Product['images']): Product['images'] {
  // Keep the live gallery in step with approved image changes until guarded SQL migrations run.
  if (slug === 'pearl-drift' && images.length === 10 &&
      images[0]?.src === '/products/pearl-drift/01.jpg' &&
      images[7]?.src === '/products/pearl-drift/06.png' && images[7]?.kind === 'graphic') {
    return [{ ...images[7], kind: 'photo' }, ...images.slice(0, 7), ...images.slice(8)];
  }
  if (slug === 'still-within' && images.length === 9 &&
      images[0]?.src === '/products/still-within/01.webp' &&
      images[3]?.src === '/products/still-within/05-updated.webp') {
    return [images[3], ...images.slice(0, 3), ...images.slice(4)];
  }
  if (slug === 'aquamarine-tide' && images.length === aquamarineBeforeAddition.length &&
      images.every((image, index) => image.src === aquamarineBeforeAddition[index])) {
    return [...images, ...aquamarineNewImages];
  }
  return images;
}
async function localPreviewCatalog(): Promise<CatalogProduct[] | null> {
  if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_URL) return null;
  const { products } = await import('./catalog-seed');
  return products.map((product, sortOrder) => ({ ...product, sortOrder, version: 1,
    updatedAt: new Date(0).toISOString() }));
}
function mapProduct(row: Record<string, unknown>): CatalogProduct {
  const slug = String(row.slug);
  return { slug, sku: String(row.sku), name: String(row.name),
    collection: row.collection as Product['collection'], stone: String(row.stone),
    priceCents: Number(row.price_cents), price: formatCad(Number(row.price_cents)),
    blurb: String(row.blurb), description: String(row.description), meaning: String(row.meaning),
    story: row.story as Product['story'] ?? undefined,
    images: publishedImages(slug, row.images as Product['images']),
    active: row.active === true, placeholder: row.placeholder === true,
    sortOrder: Number(row.sort_order), version: Number(row.version),
    updatedAt: new Date(row.updated_at as string | Date).toISOString() };
}
export function createCatalogStore(client: Query) {
  async function list(includeDisabled = false) {
    const preview = await localPreviewCatalog();
    if (preview) return preview.filter(product => includeDisabled || product.active);
    return (await client.query('SELECT * FROM catalog_products WHERE ($1::boolean OR active) ORDER BY sort_order, slug', [includeDisabled])).map(mapProduct);
  }
  async function get(slug: string) {
    const preview = await localPreviewCatalog();
    if (preview) return preview.find(product => product.slug === slug) ?? null;
    const rows = await client.query('SELECT * FROM catalog_products WHERE slug = $1', [slug]);
    return rows[0] ? mapProduct(rows[0]) : null;
  }
  async function update(slug: string, v: CatalogUpdate) {
    // One statement makes the version check, update and audit record atomic.
    const rows = await client.query(`WITH changed AS (
      UPDATE catalog_products SET name=$3, collection=$4, stone=$5, price_cents=$6,
        blurb=$7, description=$8, meaning=$9, story=$10::jsonb, active=$11,
        placeholder=$12, sort_order=$13, version=version+1, updated_at=now()
      WHERE slug=$1 AND version=$2 RETURNING *
    ), recorded AS (
      INSERT INTO catalog_product_events (slug, version, snapshot)
      SELECT slug, version, to_jsonb(changed) FROM changed RETURNING id
    ) SELECT changed.* FROM changed CROSS JOIN recorded`,
    [slug, v.version, v.name, v.collection, v.stone, v.priceCents, v.blurb, v.description,
      v.meaning, v.story ? JSON.stringify(v.story) : null, v.active, v.placeholder, v.sortOrder]);
    if (!rows[0]) throw new CatalogConflictError('This product changed in another window. Reload before saving again.');
    return mapProduct(rows[0]);
  }
  return { list, get, update };
}
export const catalog = createCatalogStore({ query: async (text, params) => {
  if (!process.env.DATABASE_URL) throw new Error('Catalogue database is not configured.');
  return neon(process.env.DATABASE_URL).query(text, params);
} });
// Request-only memoization: a new page request sees owner edits immediately.
export const getPublicCatalog = cache(() => catalog.list());
