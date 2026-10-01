import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { catalog } from '@/lib/catalog-store';
import { ProductEditor } from '@/components/admin/ProductEditor';

export const metadata = { title: 'Edit product' };

export default async function AdminProduct({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const product = await catalog.get((await params).slug);
  if (!product) notFound();
  return <><Link href="/admin/products" className="admin-back">← Products</Link><div className="admin-eyebrow">EDIT PRODUCT</div>
    <h1>{product.name}</h1><p className="admin-muted">{product.sku} · /shop/{product.slug}</p>
    <ProductEditor key={`${product.slug}-${product.version}`} product={product} />
  </>;
}
