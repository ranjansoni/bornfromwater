import type { NextConfig } from "next";

function contentSecurityPolicy(analytics: boolean) {
  const analyticsScript = analytics ? " https://www.googletagmanager.com" : "";
  const analyticsConnect = analytics ? " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" : "";
  // Prerendered Next.js pages use inline bootstrap scripts and inline styles.
  // Development additionally needs eval; production never enables it.
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://checkout.stripe.com${analyticsScript}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' https://checkout.stripe.com${analyticsConnect}`,
    `img-src 'self' data: blob: https://*.stripe.com${analyticsConnect}`,
    "font-src 'self' data:",
    "frame-src https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
  ].join("; ");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy(true) }] },
      { source: "/checkout/:path*", headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy(false) },
        { key: "Referrer-Policy", value: "no-referrer" },
      ] },
      ...["/admin/:path*", "/api/admin/:path*"].map(source => ({ source, headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy(false) },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "private, no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ] })),
    ];
  },
};

export default nextConfig;
