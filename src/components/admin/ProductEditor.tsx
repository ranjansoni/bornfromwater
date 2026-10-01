'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog-store';

export function ProductEditor({ product }: { product: CatalogProduct }) {
  const [version, setVersion] = useState(product.version);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [availability, setAvailability] = useState(!product.active ? 'disabled' : product.placeholder ? 'coming-soon' : 'active');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setSaved(false);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/admin/products/${product.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, sortOrder: Number(fields.sortOrder), version }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the product.');
      setVersion(data.product.version); setSaved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the product.'); }
    finally { setSaving(false); }
  }
  return <div className="admin-product-editor">
    <form className="admin-form" onSubmit={save} onChange={() => setSaved(false)}>
      <fieldset disabled={saving}>
        <div className="admin-panel"><h2>Product details</h2>
          <label>Product name<input name="name" defaultValue={product.name} required maxLength={160} /></label>
          <div className="admin-field-grid"><label>Price (CAD)<input name="price" defaultValue={(product.priceCents / 100).toFixed(2)} inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" /></label>
            <label>Availability<select name="availability" value={availability} onChange={e => setAvailability(e.target.value)}><option value="active">Active — available to buy</option><option value="coming-soon">Coming soon — visible, cannot buy</option><option value="disabled">Disabled — hidden from the shop</option></select></label></div>
          <p className="admin-hint">Disabling prevents new checkouts. Existing orders and already-started checkouts keep their original details and price.</p>
          <div className="admin-field-grid"><label>Collection<select name="collection" defaultValue={product.collection}><option value="signature">Signature</option><option value="tide">Tide</option></select></label>
            <label>Display order<input name="sortOrder" type="number" min={0} max={9999} step={1} required defaultValue={product.sortOrder} /></label></div>
          <label>Stone / materials label<input name="stone" defaultValue={product.stone} required maxLength={160} /></label>
          <label>Short description — product card<textarea name="blurb" defaultValue={product.blurb} required maxLength={500} rows={3} /></label>
          <label>Description — search results and product page when there is no story<textarea name="description" defaultValue={product.description} required maxLength={4000} rows={5} /></label>
          <label>The stone — meaning<textarea name="meaning" defaultValue={product.meaning} maxLength={4000} rows={4} /></label>
        </div>
        <div className="admin-panel"><h2>The story</h2><p className="admin-muted">Optional. Leave both fields blank to show the description instead.</p>
          <label>Story title<input name="storyTitle" defaultValue={product.story?.title ?? ''} maxLength={160} /></label>
          <label>Story paragraphs — separate with a blank line<textarea name="storyText" defaultValue={product.story?.paragraphs.join('\n\n') ?? ''} maxLength={12000} rows={12} /></label>
        </div>
      </fieldset>
      {error && <p role="alert" className="admin-error">{error}</p>}
      <div className="admin-save"><button disabled={saving} className="admin-button">{saving ? 'Saving…' : 'Save product'}</button>
        {saved && <p role="status" className="admin-success">Product saved. The shop now uses these details.</p>}
        <Link href="/admin/products" className="admin-link">Back to products</Link></div>
    </form>
    <aside><div className="admin-panel"><h2>Current photographs</h2><p className="admin-muted">Your existing images and gallery layout are preserved.</p>
      <div className="admin-product-photos">{product.images.map(img => <Image key={img.src} src={img.src} alt={product.name} width={160} height={160} />)}</div>
      {availability !== 'disabled' && <Link href={`/shop/${product.slug}`} target="_blank" className="admin-link">View product ↗</Link>}
    </div></aside>
  </div>;
}
