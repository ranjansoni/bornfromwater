import { catalog } from '@/lib/catalog-store';
import { purchaseEligibility } from '@/lib/purchase-location';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try { return Response.json({ products: await catalog.list(), purchaseEligibility: purchaseEligibility(request.headers) }, { headers }); }
  catch { return Response.json({ error: 'The catalogue is temporarily unavailable.' }, { status: 503, headers }); }
}
