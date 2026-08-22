import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

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
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: "Born From Water",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={archivo.variable}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
      <GoogleAnalytics gaId="G-6WYHQZM2XF" />
    </html>
  );
}
