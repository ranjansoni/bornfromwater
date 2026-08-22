"use client";

import Link from "next/link";
import { useState } from "react";
import { TIDE_LIVE } from "@/lib/products";

const nav = [
  { label: "Shop", href: "/" },
  ...(TIDE_LIVE ? [{ label: "Tide", href: "/collections/tide" }] : []),
  { label: "About", href: "/about" },
  { label: "Care", href: "/care" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="rule-b">
      <div className="flex items-center justify-between gap-6 px-6 py-4 md:px-12 md:py-5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-[20px] font-extrabold tracking-[-0.02em] uppercase">
            Born From Water
          </span>
          <span className="hidden text-[11px] tracking-[0.14em] text-mid uppercase sm:inline">
            Vancouver, BC
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-[26px] md:flex">
            {nav.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="text-[13px] tracking-[0.1em] uppercase transition-colors hover:text-accent"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            className="flex h-[38px] w-[38px] items-center justify-center border-2 border-divider md:hidden"
          >
            <span className="text-[15px] leading-none font-extrabold">
              {open ? "×" : "≡"}
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="rule-t flex flex-col md:hidden"
          onClick={() => setOpen(false)}
        >
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="border-b border-surface px-6 py-4 text-[13px] tracking-[0.1em] uppercase last:border-b-0 hover:text-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
