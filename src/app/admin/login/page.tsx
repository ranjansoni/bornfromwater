import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-session';
import { AdminLogin } from '@/components/admin/AdminLogin';
export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin/orders');
  return <section className="admin-login"><p className="admin-eyebrow">OWNER ACCESS</p><h1>Your shop, in order.</h1>
    <p className="admin-muted">Sign in to review orders and keep track of each shipment.</p><AdminLogin />
  </section>;
}
