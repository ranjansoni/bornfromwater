'use client';
import { usePathname } from 'next/navigation';
import { CartProvider } from './CartProvider';
import { Header } from './Header';
import { Footer } from './Footer';
import type { Product } from '@/lib/products';

export function StoreShell({ children, products }: { children: React.ReactNode; products: Product[] }) {
  const path = usePathname();
  if (path === '/admin' || path.startsWith('/admin/')) return <>{children}</>;
  return <CartProvider initialProducts={products}><Header /><main>{children}</main><Footer /></CartProvider>;
}
