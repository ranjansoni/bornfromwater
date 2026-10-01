'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOrder } from '@/lib/admin-order-store';
import { fulfillmentStatuses, statusLabels, type DeliveryContact, type FulfillmentUpdate } from '@/lib/order-management';

const contactFields: { key: keyof DeliveryContact; label: string; max: number; optional?: boolean; wide?: boolean }[] = [
  { key: 'name', label: 'Customer name', max: 160 }, { key: 'email', label: 'Email', max: 254 },
  { key: 'phone', label: 'Phone (optional)', max: 40, optional: true },
  { key: 'line1', label: 'Street address', max: 200, wide: true },
  { key: 'line2', label: 'Apartment / unit (optional)', max: 200, optional: true, wide: true },
  { key: 'city', label: 'City', max: 100 }, { key: 'province', label: 'Province / territory', max: 50 },
  { key: 'postalCode', label: 'Postal code', max: 20 },
];
export function OrderEditor({ order }: { order: AdminOrder }) {
  const [value, setValue] = useState<FulfillmentUpdate>({ status: order.status, carrier: order.carrier,
    trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl, customer: { ...order.customer, country: order.customer.country || 'CA' },
    internalNote: order.internalNote, version: order.version });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  function change(patch: Partial<FulfillmentUpdate>) { setValue(v => ({ ...v, ...patch })); setMessage(''); setError(''); }
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/orders/${order.orderId}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setError('Your session expired. Sign in again before saving.');
        else setError(data.error || 'The order could not be saved.');
      } else { setValue(v => ({ ...v, version: data.version })); setMessage(value.status === 'cancelled' ? 'Order cancelled. Any refund must be issued separately in Stripe.' : 'Order updated.'); router.refresh(); }
    } catch { setError('Could not connect. Your changes have not been confirmed. Please try again.'); }
    setPending(false);
  }
  return <form onSubmit={save} className="admin-form">
    <fieldset disabled={pending} className="admin-panel"><legend>Fulfillment</legend>
      <label>Order status<select value={value.status} onChange={e => change({ status: e.target.value as FulfillmentUpdate['status'] })}>
        {fulfillmentStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
      {value.status === 'cancelled' && <p className="admin-cancellation">Saving removes this order from the packing and shipping queues. It does not issue a refund or notify the customer. Use the Stripe payment link to handle any refund.</p>}
      <div className="admin-field-grid"><label>Carrier<input value={value.carrier} maxLength={80} placeholder="e.g. Canada Post" onChange={e => change({ carrier: e.target.value })} /></label>
        <label>Tracking number<input value={value.trackingNumber} maxLength={160} onChange={e => change({ trackingNumber: e.target.value })} /></label></div>
      <label>Tracking link (optional)<input value={value.trackingUrl} type="url" maxLength={1000} placeholder="https://…" onChange={e => change({ trackingUrl: e.target.value })} /></label>
      <label>Internal notes<textarea rows={3} value={value.internalNote} maxLength={2000} required={value.status === 'cancelled'} placeholder={value.status === 'cancelled' ? 'Cancellation reason (required)…' : 'Packing instructions, customer requests, or an untracked shipment…'} onChange={e => change({ internalNote: e.target.value })} /></label>
      {value.status === 'cancelled' && <p className="admin-hint admin-muted">Include the cancellation reason above. It will be kept in the activity history.</p>}
      <p className="admin-hint admin-muted">These notes and status updates are for your team. They do not send emails to the customer.</p>
    </fieldset>
    <fieldset disabled={pending} className="admin-panel"><legend>Customer &amp; delivery</legend>
      <div className="admin-field-grid">{contactFields.map(({ key, label, max, optional, wide }) => <label key={key} className={wide ? 'admin-field-wide' : ''}>{label}
        <input value={value.customer[key]} maxLength={max} required={!optional} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
          onChange={e => change({ customer: { ...value.customer, [key]: e.target.value } })} /></label>)}
        <label>Country<select value={value.customer.country} onChange={e => change({ customer: { ...value.customer, country: e.target.value } })}><option value="CA">Canada</option></select></label></div>
      <p className="admin-hint admin-muted">You can correct delivery details here. The original checkout record is retained.</p>
    </fieldset>
    <div className="admin-save"><button type="submit" className="admin-button" disabled={pending}>{pending ? 'Saving…' : value.status === 'cancelled' && order.status !== 'cancelled' ? 'Cancel order' : 'Save order'}</button>
      <p role="status" className="admin-success">{message}</p>{error && <p role="alert" className="admin-error">{error}</p>}</div>
  </form>;
}
