import { catalog } from '@/lib/catalog-store';
export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try { return Response.json({ products: await catalog.list() }, { headers }); }
  catch { return Response.json({ error: 'The catalogue is temporarily unavailable.' }, { status: 503, headers }); }
}
