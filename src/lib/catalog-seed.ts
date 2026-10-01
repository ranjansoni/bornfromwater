// Migration/test fixture only. Runtime catalogue data comes from Postgres.
import raw from '@/data/products.json';
import images from '@/data/images.json';
import type { Product, ProductImage } from './products';
const imageMap = images as Record<string, { file: string; kind: ProductImage['kind'] }[]>;
export const products: Product[] = raw.map(p => ({ ...p, collection: p.collection as Product['collection'],
  active: true, placeholder: p.placeholder ?? false,
  images: (imageMap[p.slug] ?? []).map(i => ({ src: `/products/${p.slug}/${i.file}`, kind: i.kind })) }));
