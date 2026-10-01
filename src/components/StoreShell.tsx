'use client';
import { usePathname } from 'next/navigation';
import { CartProvider, useCart } from './CartProvider';
import { Header } from './Header';
import { Footer } from './Footer';
import type { Product } from '@/lib/products';
import type { PurchaseEligibility } from '@/lib/purchase-policy';

export function StoreShell({ children, products, purchaseEligibility }: { children: React.ReactNode; products: Product[]; purchaseEligibility: PurchaseEligibility }) {
  const path = usePathname();
  if (path === '/admin' || path.startsWith('/admin/')) return <>{children}</>;
  return <CartProvider initialProducts={products} initialPurchaseEligibility={purchaseEligibility}><Header /><PurchaseNotice /><main>{children}</main><Footer /></CartProvider>;
}

function PurchaseNotice() {
  const { purchaseEligibility } = useCart();
  if (purchaseEligibility.allowed) return null;
  return <p role="status" className="rule-b bg-surface px-6 py-4 text-[13px] leading-relaxed text-ink md:px-12">{purchaseEligibility.message}</p>;
}
