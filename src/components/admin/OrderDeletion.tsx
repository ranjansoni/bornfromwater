'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DeletedOrdersFilter({ checked, href }: { checked: boolean; href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <label className="admin-deleted-filter"><input type="checkbox" checked={checked} disabled={pending}
    onChange={() => startTransition(() => router.push(href))} />Show deleted orders</label>;
}

export function OrderDeletion({ orderId, version, deleted }: { orderId: string; version: number; deleted: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/visibility`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted: !deleted, version }) });
      const data = await response.json();
      if (!response.ok) {
        setError(response.status === 401 ? 'Your session expired. Sign in again.' : data.error || 'The order could not be changed.');
      } else { setConfirming(false); router.refresh(); }
    } catch { setError('The change has not been confirmed. Refresh the order before trying again.'); }
    setPending(false);
  }
  return <section className="admin-panel admin-order-deletion"><h2>{deleted ? 'Restore order' : 'Delete order'}</h2>
    <p className="admin-muted">{deleted ? 'Restore this order to the order lists with its previous fulfillment status and details.' : 'Hide this order from the default lists and counts. You can find and restore it using “Show deleted orders”.'}</p>
    <p className="admin-hint admin-muted">This does not cancel or refund a payment, change shipping, or erase order history.</p>
    {confirming && <p className="admin-hint">Delete this order from the default view? Unsaved edits will not be saved.</p>}
    <div className="admin-save">
      {deleted || confirming ? <button className="admin-button admin-secondary" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : deleted ? 'Restore order' : 'Confirm delete'}</button>
        : <button className="admin-button admin-secondary" onClick={() => setConfirming(true)}>Delete order</button>}
      {confirming && <button className="admin-text-button" disabled={pending} onClick={() => setConfirming(false)}>Keep order</button>}
    </div>
    {error && <p role="alert" className="admin-error">{error}</p>}
  </section>;
}
