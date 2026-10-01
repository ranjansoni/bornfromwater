import Link from 'next/link';
import Image from 'next/image';
import { requireAdmin } from '@/lib/admin-session';
import { catalog } from '@/lib/catalog-store';
import { cardImage, collectionLabel, formatCad } from '@/lib/products';

export const metadata = { title: 'Products' };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = ['active', 'disabled', 'coming-soon'].includes(params.status ?? '') ? params.status : 'all';
  const query = (params.q ?? '').slice(0, 100);
  const all = await catalog.list(true);
  const products = all.filter(p => (status === 'all' || (status === 'disabled' ? !p.active : p.active && p.placeholder === (status === 'coming-soon'))) &&
    `${p.name} ${p.sku} ${p.stone}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="admin-eyebrow">CATALOGUE</div>
    <div className="admin-title-row"><div><h1>Products</h1><p className="admin-muted">Edit your products, pricing and availability. Saved changes appear in this shop immediately.</p></div></div>
    <form className="admin-catalog-filters" action="/admin/products">
      <label>Search products<input name="q" defaultValue={query} maxLength={100} placeholder="Name, stone or SKU" /></label>
      <label>Availability<select name="status" defaultValue={status}><option value="all">All products</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="coming-soon">Coming soon</option></select></label>
      <button className="admin-button admin-secondary">Filter</button>
    </form>
    <div className="admin-list-heading"><h2>{products.length} {products.length === 1 ? 'product' : 'products'}</h2><span>All prices in CAD</span></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Availability</th><th /></tr></thead><tbody>
      {products.map(p => { const img = cardImage(p); return <tr key={p.slug}>
        <td><Link className="admin-product-cell" href={`/admin/products/${p.slug}`}>{img && <Image src={img.src} alt="" width={58} height={58} />}<span className="admin-order-number">{p.name}<small>{p.sku}</small></span></Link></td>
        <td>{collectionLabel[p.collection]}</td><td>{formatCad(p.priceCents)}</td>
        <td><span className={`admin-badge ${!p.active ? 'admin-status-cancelled' : p.placeholder ? 'admin-status-packed' : 'admin-status-delivered'}`}>{!p.active ? 'Disabled' : p.placeholder ? 'Coming soon' : 'Active'}</span></td>
        <td><Link className="admin-link" href={`/admin/products/${p.slug}`}>Edit product →</Link></td>
      </tr>; })}
    </tbody></table></div>
    {!products.length && <div className="admin-empty">No products match these filters.</div>}
  </>;
}
