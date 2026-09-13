import { poyntCallbackRedirect, verifyPoyntCallback } from "@/lib/poynt-oauth";
import { currentPoyntAuthorizationKey } from "@/lib/poynt-oauth-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (request.url.length > 12_000) return poyntCallbackRedirect(false);
    const verified = await verifyPoyntCallback(new URL(request.url).searchParams, {
      applicationId: process.env.POYNT_APPLICATION_ID,
      businessId: process.env.POYNT_BUSINESS_ID,
    }, currentPoyntAuthorizationKey);
    return poyntCallbackRedirect(verified);
  } catch {
    // Do not log request URLs, query parameters, JWTs, or exception details.
    return poyntCallbackRedirect(false);
  }
}
