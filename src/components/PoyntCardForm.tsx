"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

type CollectInstance = {
  mount(id: string, documentValue: Document, options: Record<string, unknown>): void;
  unmount(id: string, documentValue: Document): void;
  on(event: "ready" | "nonce" | "error", callback: (value: unknown) => void): void;
  getNonce(): void;
};

declare global {
  interface Window {
    TokenizeJs?: new (businessId: string, applicationId: string) => CollectInstance;
  }
}

type Props = {
  applicationId: string;
  businessId: string;
  sdkUrl: string;
  token: string;
};

export function PoyntCardForm({ applicationId, businessId, sdkUrl, token }: Props) {
  const router = useRouter();
  const collectRef = useRef<CollectInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sdkReady || !window.TokenizeJs) return;
    const collect = new window.TokenizeJs(businessId, applicationId);
    collectRef.current = collect;

    collect.on("ready", () => setFormReady(true));
    collect.on("error", () => {
      setSubmitting(false);
      setError("Check the card details and try again.");
    });
    collect.on("nonce", async (value) => {
      const event = value as { data?: { nonce?: string } };
      if (!event.data?.nonce) {
        setSubmitting(false);
        setError("Secure payment could not be prepared. Please try again.");
        return;
      }

      try {
        const response = await fetch("/api/checkout/charge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nonce: event.data.nonce }),
        });
        const result = (await response.json()) as {
          status?: string;
          confirmationPath?: string;
          error?: string;
        };
        if (response.status === 402 && result.confirmationPath) {
          sessionStorage.removeItem("bfw-checkout-attempt");
          router.replace(result.confirmationPath);
          return;
        }
        if (!response.ok || !result.confirmationPath) {
          throw new Error(result.error ?? "Payment could not be processed.");
        }
        router.replace(result.confirmationPath);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Payment could not be processed.");
        setSubmitting(false);
      }
    });

    collect.mount("poynt-card-form", document, {
      displayComponents: { labels: true },
      iFrame: {
        width: "100%",
        height: "280px",
        border: "0",
        borderRadius: "0",
        boxShadow: "none",
      },
      style: { theme: "ecommerce" },
      locale: "en-CA",
      paymentMethods: ["card"],
      inlineErrors: true,
    });

    return () => {
      collectRef.current = null;
      collect.unmount("poynt-card-form", document);
    };
  }, [applicationId, businessId, router, sdkReady, token]);

  function submit() {
    if (!collectRef.current || !formReady || submitting) return;
    setError("");
    setSubmitting(true);
    collectRef.current.getNonce();
  }

  return (
    <div className="mt-8">
      <Script
        id="poynt-collect-sdk"
        src={sdkUrl}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={() => setError("The secure card form could not be loaded.")}
      />
      <div id="poynt-card-form" className="min-h-[280px] border-2 border-divider bg-white" />
      {error && (
        <p role="alert" className="mt-4 border-2 border-accent bg-accent-100 p-3 text-[13px]">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!formReady || submitting}
        className="mt-5 w-full bg-accent px-[22px] py-[14px] text-left text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase hover:bg-accent-600 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Processing payment…" : formReady ? "Pay securely" : "Loading secure form…"}
      </button>
      <p className="mt-3 text-[12px] leading-[1.5] text-mid">
        Card details are entered directly into GoDaddy Payments&apos; secure form and never pass
        through Born From Water.
      </p>
    </div>
  );
}
