import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin-session';
import { AdminLogout } from '@/components/admin/AdminLogin';
import './orders.css';

export const metadata: Metadata = { title: 'Orders', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  return <div className="admin-shell">
    <header className="admin-header"><Link href="/admin/orders" className="admin-brand">BORN FROM WATER<span>SHOP OPERATIONS</span></Link>
      <nav aria-label="Admin navigation">{signedIn && <><Link href="/admin/orders">Orders</Link><Link href="/admin/carts">Carts</Link></>}<Link href="/">View shop ↗</Link>{signedIn && <AdminLogout />}</nav></header>
    <main className="admin-main">{children}</main>
    <footer className="admin-footer">Born From Water · Vancouver, BC<span>All times Pacific</span></footer>
  </div>;
}
