"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";

export function StoreAnalytics() {
  const pathname = usePathname();
  // Checkout links contain signed order tokens; keep them out of analytics.
  if (pathname.startsWith("/checkout")) return null;
  return <GoogleAnalytics gaId="G-6WYHQZM2XF" />;
}
