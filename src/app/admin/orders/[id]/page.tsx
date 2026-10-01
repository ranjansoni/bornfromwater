import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { adminOrders } from '@/lib/admin-order-store';
import { stripeConfiguration } from '@/lib/stripe-config';
import { money, orderDate, statusLabels } from '@/lib/order-management';
import { isUuid } from '@/lib/orders';
import { OrderEditor } from '@/components/admin/OrderEditor';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const scope = stripeConfiguration();
  const order = await adminOrders.getAdminOrder(id, scope);
  if (!order) notFound();
  const events = await adminOrders.orderEvents(id);
  const editable = order.provider === 'stripe' && order.paymentStatus === 'approved';
  const stripeUrl = order.paymentIntentId ? `https://dashboard.stripe.com/${scope.accountId}/${order.livemode ? '' : 'test/'}payments/${order.paymentIntentId}` : null;
  return <>
    <Link className="admin-back" href={order.provider === 'godaddy' ? '/admin/orders?status=history' : '/admin/orders?status=all'}>← Back to orders</Link>
    <div className="admin-title-row"><div><p className="admin-eyebrow">ORDER DETAILS</p><h1>#{id.slice(0, 8).toUpperCase()}</h1>
      <p className="admin-muted">{orderDate(order.createdAt)}</p></div><span className={`admin-badge admin-status-${order.status}`}>{editable ? statusLabels[order.status] : order.paymentStatus}</span></div>
    {order.provider === 'stripe' && !order.livemode && <p className="admin-sandbox"><strong>Sandbox order</strong> · You can test this workflow without shipping anything.</p>}
    {order.provider === 'godaddy' && <p className="admin-sandbox"><strong>GoDaddy history</strong> · Original record, kept for reference.</p>}
    {order.status === 'cancelled' && <p className="admin-cancellation"><strong>Order cancelled.</strong> Do not fulfill this order. Cancellation does not confirm a refund; check the payment in Stripe for its current refund status.</p>}
    <div className="admin-detail-grid"><aside>
      <section className="admin-panel"><h2>Order summary</h2><ul className="admin-items">{order.items.map((item, index) => <li key={`${item.sku}-${index}`}>
        <div><strong>{item.name || item.sku}</strong><small>{item.sku} · Qty {item.quantity}</small></div><span>{money(item.unitPriceCents * item.quantity, order.currency)}</span></li>)}</ul>
        <dl className="admin-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div><div><dt>Shipping</dt><dd>{money(order.shipping, order.currency)}</dd></div>
          <div><dt>Tax</dt><dd>{money(order.tax, order.currency)}</dd></div><div className="admin-total"><dt>Total</dt><dd>{money(order.total, order.currency)} {order.currency}</dd></div></dl>
        <p className="admin-payment">{order.paymentStatus === 'approved' ? '✓ Payment confirmed at checkout' : `Payment: ${order.paymentStatus}`}</p>
        {stripeUrl && <><a href={stripeUrl} target="_blank" rel="noopener noreferrer" className="admin-link">View payment in Stripe ↗</a>
          <p className="admin-hint admin-muted">Check Stripe for any refunds or disputes before shipping.</p></>}
      </section>
      <section className="admin-panel"><h2>Bracelet size / order note</h2><p className="admin-preserve">{order.orderNote || 'No note added at checkout.'}</p></section>
      {order.carrier && <section className="admin-panel"><h2>Shipment</h2><p className="admin-preserve">{order.carrier}{order.trackingNumber ? `\n${order.trackingNumber}` : '\nUntracked shipment'}</p>
        {order.trackingUrl.startsWith('https://') && <a className="admin-link" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track shipment ↗</a>}</section>}
      <section className="admin-panel"><h2>Activity</h2><ol className="admin-activity">{events.map(event => <li key={event.id}><strong>{statusLabels[event.status]} · Order updated</strong>
        <small>{orderDate(event.createdAt)}</small>{event.carrier && <p>{event.carrier}{event.trackingNumber ? ` · ${event.trackingNumber}` : ''}</p>}
        {event.status === 'cancelled' && event.internalNote && <p className="admin-preserve">Reason / notes: {event.internalNote}</p>}</li>)}
        <li><strong>{order.paymentStatus === 'approved' ? 'Order received' : 'Checkout created'}</strong><small>{orderDate(order.createdAt)}</small></li></ol></section>
      <details className="admin-panel"><summary>Original checkout details</summary><p className="admin-preserve">{Object.values(order.originalCustomer).filter(Boolean).join('\n') || 'Not recorded for this historical order.'}</p>
        <small className="admin-muted">Full order ID: {id}</small></details>
    </aside><section aria-label="Manage order">{editable ? <OrderEditor order={order} /> : <div className="admin-panel"><h2>Read-only order</h2><p>Only confirmed Stripe orders can be updated here.</p></div>}</section></div>
  </>;
}
