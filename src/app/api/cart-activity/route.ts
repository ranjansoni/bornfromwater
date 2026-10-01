import { handleCartActivity } from '@/lib/cart-activity-handler';
export const runtime = 'nodejs';
export const POST = (request: Request) => handleCartActivity(request);
