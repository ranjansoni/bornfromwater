'use client';
import { usePathname } from 'next/navigation';
import { CartProvider } from './CartProvider';
import { Header } from './Header';
import { Footer } from './Footer';

export function StoreShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/admin' || path.startsWith('/admin/')) return <>{children}</>;
  return <CartProvider><Header /><main>{children}</main><Footer /></CartProvider>;
}
