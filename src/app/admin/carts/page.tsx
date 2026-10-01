import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-session';
import { cartActivity } from '@/lib/cart-activity-store';
import { cartScope } from '@/lib/cart-activity';
import { money, orderDate } from '@/lib/order-management';
import { AdminRefresh } from '@/components/admin/AdminLogin';

export const metadata = { title: 'Carts' };

export default async function CartsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const scope = cartScope();
  const result = await cartActivity.list(scope, String(params.view ?? ''), Number(params.page) || 1);
  const href = (view: string, page = 1) => `/admin/carts?${new URLSearchParams({ view, ...(page > 1 ? { page: String(page) } : {}) })}`;
  return <>
    <div className="admin-title-row"><div><p className="admin-eyebrow">BEFORE THE ORDER</p><h1>Carts</h1>
      <p className="admin-muted">See what shoppers left in their baskets.</p></div><AdminRefresh label="Refresh carts" /></div>
    {!scope.livemode && <p className="admin-sandbox"><strong>Sandbox</strong> · Cart activity from this test shop.</p>}
    <div className="admin-toolbar"><nav aria-label="Cart views">
      <Link href={href('abandoned')} className={result.stage === 'abandoned' ? 'is-active' : ''}>Potentially abandoned ({result.counts.abandoned ?? 0})</Link>
      <Link href={href('recent')} className={result.stage === 'recent' ? 'is-active' : ''}>Recent ({result.counts.recent ?? 0})</Link>
    </nav></div>
    <p className="admin-muted admin-cart-explanation">Potentially abandoned means no cart activity for 24 hours. This view covers the last 30 days and excludes empty carts and matching paid or processing checkouts. A shopper may still return.</p>
    <p className="admin-muted admin-cart-explanation">Shoppers are anonymous here. No names, emails or reminder permissions are collected, and no reminder emails are sent. Tracking starts with this update; earlier browser-only carts cannot be recovered until the shopper returns.</p>
    {result.carts.length ? <div className="admin-cart-list">{result.carts.map(cart => <article key={cart.id} className="admin-panel">
      <div className="admin-title-row"><div><h2>Anonymous cart #{cart.id.slice(0, 8).toUpperCase()}</h2><p className="admin-hint admin-muted">Last cart activity: {orderDate(cart.lastActivity)}</p></div>
        <span className="admin-badge">{cart.stage === 'abandoned' ? 'Potentially abandoned' : 'Recent activity'}</span></div>
      <ul className="admin-items">{cart.items.map(item => <li key={item.sku}><div><strong>{item.name || item.sku}</strong><small>Qty {item.quantity}</small></div><span>{money(item.unitPriceCents * item.quantity)}</span></li>)}</ul>
      <div className="admin-cart-total"><strong>Item subtotal</strong><strong>{money(cart.subtotal)} CAD</strong></div>
      <p className="admin-hint admin-muted">Shipping and tax are not included. First seen {orderDate(cart.firstSeen)}.</p>
      {cart.orderId ? <Link className="admin-link" href={`/admin/orders/${cart.orderId}`}>Checkout started · View checkout →</Link> : <p className="admin-hint admin-muted">Checkout has not started.</p>}
    </article>)}</div> : <section className="admin-empty"><h3>{result.stage === 'abandoned' ? 'No abandoned carts yet.' : 'No recent carts.'}</h3><p>New cart activity will appear here as shoppers add items.</p></section>}
    <div className="admin-pagination">{result.page > 1 && <Link href={href(result.stage, result.page - 1)}>← Previous</Link>}<span>Page {result.page}</span>{result.hasMore && <Link href={href(result.stage, result.page + 1)}>Next →</Link>}</div>
  </>;
}
