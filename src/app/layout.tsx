import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { StoreAnalytics } from "@/components/StoreAnalytics";
import { StoreShell } from "@/components/StoreShell";
import "./globals.css";
import { getPublicCatalog } from "@/lib/catalog-store";
export const dynamic = "force-dynamic";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bornfromwater.ca"),
  title: {
    default: "Born From Water — Handcrafted gold-filled gemstone bracelets",
    template: "%s — Born From Water",
  },
  description:
    "Inspired by the ocean. Handcrafted with purpose. Genuine gemstones on 14k gold-filled, finished by hand in Vancouver, Canada.",
  verification: {
    google: "89BwsfRezzQEawz5XOhCo1XZLrKl4E-HhFopZPgBx00",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: "Born From Water",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const products = await getPublicCatalog();
  return (
    <html lang="en-CA" className={archivo.variable}>
      <body>
        <StoreShell products={products}>{children}</StoreShell>
      </body>
      <StoreAnalytics />
    </html>
  );
}
