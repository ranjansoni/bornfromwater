import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-start font-extrabold uppercase transition-colors";

const variants: Record<Variant, string> = {
  // Modernist: labels are flush left, never centred.
  primary:
    "bg-accent text-sand px-[22px] py-[14px] text-[13px] tracking-[0.1em] hover:bg-accent-600",
  secondary:
    "border-2 border-divider text-ink px-[20px] py-[12px] text-[13px] tracking-[0.1em] hover:bg-surface",
  ghost:
    "text-accent-700 text-[12px] tracking-[0.12em] hover:text-accent hover:underline",
};

type Props = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
} & (
  | ({ href: string; external?: boolean } & Omit<
      ComponentProps<"a">,
      "href" | "className" | "children"
    >)
  | ({ href?: undefined } & Omit<
      ComponentProps<"button">,
      "className" | "children"
    >)
);

export function Button({
  variant = "primary",
  children,
  className = "",
  ...rest
}: Props) {
  const cls = `${base} ${variants[variant]} ${className}`;

  if ("href" in rest && rest.href) {
    const { href, external, ...anchorProps } = rest as {
      href: string;
      external?: boolean;
    } & ComponentProps<"a">;

    // Every outbound Etsy link opens in a new tab.
    if (external || href.startsWith("http")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cls}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...(rest as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
