import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-session';
import { adminOrders } from '@/lib/admin-order-store';
import { stripeConfiguration } from '@/lib/stripe-config';
import { fulfillmentStatuses, money, orderDate, statusLabels } from '@/lib/order-management';
import { AdminRefresh } from '@/components/admin/AdminLogin';
import { DeletedOrdersFilter } from '@/components/admin/OrderDeletion';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const filter = typeof params.status === 'string' ? params.status : 'unfulfilled';
  const q = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const showDeleted = params.deleted === '1';
  const scope = stripeConfiguration();
  const [result, counts] = await Promise.all([adminOrders.listOrders(scope, filter, q, Number(params.page) || 1, showDeleted), adminOrders.orderCounts(scope, showDeleted)]);
  const link = (status: string, page = 1, deleted = showDeleted) => `/admin/orders?${new URLSearchParams({ status, ...(q ? { q } : {}), ...(page > 1 ? { page: String(page) } : {}), ...(deleted ? { deleted: '1' } : {}) })}`;
  return <>
    <div className="admin-title-row"><div><p className="admin-eyebrow">FROM YOUR HANDS TO THEIRS</p><h1>Orders</h1>
      <p className="admin-muted">A place for every order, from packing to delivery.</p></div><AdminRefresh /></div>
    {!scope.livemode && <p className="admin-sandbox"><strong>Sandbox</strong> · These are test orders. No real payments or shipments.</p>}
    <div className="admin-stats">{fulfillmentStatuses.map(status => <Link href={link(status)} key={status} className={result.filter === status ? 'is-active' : ''}>
      <span>{statusLabels[status]}</span><strong>{counts[status] ?? 0}</strong></Link>)}</div>
    <div className="admin-toolbar"><nav aria-label="Order views">{[['all', 'All paid orders'], ['history', 'GoDaddy history']].map(([value, label]) =>
      <Link key={value} href={link(value)} className={result.filter === value ? 'is-active' : ''}>{label}</Link>)}</nav>
      <form action="/admin/orders" className="admin-search"><input type="hidden" name="status" value={result.filter} /><label className="sr-only" htmlFor="order-search">Search orders</label>
        {showDeleted && <input type="hidden" name="deleted" value="1" />}
        <input id="order-search" name="q" defaultValue={q} maxLength={100} placeholder="Name, email, order or tracking…" /><button className="admin-button admin-secondary">Search</button></form></div>
    <div className="admin-visibility-filter"><DeletedOrdersFilter checked={showDeleted} href={link(result.filter, 1, !showDeleted)} />
      {showDeleted && <p className="admin-hint admin-muted">Lists and counts include deleted orders. Open a deleted order to restore it.</p>}</div>
    <div className="admin-list-heading"><h2>{result.filter === 'history' ? 'Historical orders' : result.filter === 'all' ? 'All paid orders' : statusLabels[result.filter as keyof typeof statusLabels]}</h2>
      <span>{q ? `Results for “${q}”` : 'Newest first'}</span></div>
    {result.filter === 'history' && <p className="admin-muted admin-hint">Original GoDaddy records are preserved here for reference. They cannot be changed in this portal.</p>}
    {result.filter === 'cancelled' && <p className="admin-cancellation">These orders are excluded from fulfillment. Refunds are managed separately in Stripe; a cancellation here does not issue or confirm a refund.</p>}
    {result.orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th><span className="sr-only">Open order</span></th></tr></thead>
      <tbody>{result.orders.map(order => <tr key={order.orderId} className={order.deletedAt ? 'admin-deleted-row' : undefined}><td><Link href={`/admin/orders/${order.orderId}`} className="admin-order-number">#{order.orderId.slice(0, 8).toUpperCase()}</Link><small>{orderDate(order.createdAt)}</small></td>
        <td><strong>{order.customer.name || 'Not recorded'}</strong><small>{order.customer.email || '—'}</small></td>
        <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} item{order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}<small>{order.items.map(item => item.name || item.sku).join(', ')}</small></td>
        <td className="admin-nowrap">{money(order.total, order.currency)}<small>{order.currency}</small></td>
        <td><span className={`admin-badge admin-status-${order.status}`}>{order.provider === 'godaddy' ? order.paymentStatus : statusLabels[order.status]}</span>{order.deletedAt && <small><span className="admin-badge admin-status-deleted">Deleted</span></small>}</td>
        <td><Link href={`/admin/orders/${order.orderId}`} aria-label={`Open order ${order.orderId.slice(0, 8)}`}>View →</Link></td></tr>)}</tbody></table></div>
      : <section className="admin-empty"><span aria-hidden="true">✧</span><h3>{q ? 'No matching orders' : 'All clear here.'}</h3><p>{q ? 'Try a different name, email or order number.' : 'Orders will appear here as they move through your workflow.'}</p></section>}
    <div className="admin-pagination">{result.page > 1 && <Link href={link(result.filter, result.page - 1)}>← Previous</Link>}<span>Page {result.page}</span>{result.hasMore && <Link href={link(result.filter, result.page + 1)}>Next →</Link>}</div>
  </>;
}
