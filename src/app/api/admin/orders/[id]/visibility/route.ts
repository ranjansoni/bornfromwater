import { handleOrderDeletion } from '@/lib/admin-handlers';
export const runtime = 'nodejs';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleOrderDeletion(request, (await context.params).id);
}
