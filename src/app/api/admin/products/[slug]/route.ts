import { handleCatalogUpdate } from '@/lib/catalog-handler';
export const runtime = 'nodejs';
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleCatalogUpdate(request, (await params).slug);
}
