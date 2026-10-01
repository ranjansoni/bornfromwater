import 'server-only';
import { CANADA_ONLY_MESSAGE, LOCATION_UNAVAILABLE_MESSAGE, type PurchaseEligibility } from './purchase-policy';

/** Trust Vercel's edge geolocation only when actually hosted on Vercel. */
export function purchaseEligibility(
  headers: Pick<Headers, 'get'>,
  env: Record<string, string | undefined> = process.env,
): PurchaseEligibility {
  // next dev has no Vercel edge. This exception cannot enable a deployed build.
  if (env.NODE_ENV === 'development' && !env.VERCEL && !env.VERCEL_ENV) {
    return { allowed: true, message: null };
  }
  const country = env.VERCEL === '1' ? headers.get('x-vercel-ip-country') : null;
  if (country === 'CA') return { allowed: true, message: null };
  return {
    allowed: false,
    message: country && /^[A-Z]{2}$/.test(country) && country !== 'XX'
      ? CANADA_ONLY_MESSAGE : LOCATION_UNAVAILABLE_MESSAGE,
  };
}
