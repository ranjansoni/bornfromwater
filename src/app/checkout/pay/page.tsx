import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

// Preserve existing signed links; GET never initiates a replacement payment.
export default async function PaymentPage({ searchParams }: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  redirect(typeof token === "string" ? `/checkout/status?token=${encodeURIComponent(token)}` : "/checkout");
}
