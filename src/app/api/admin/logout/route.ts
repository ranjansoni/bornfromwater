import { handleAdminLogout } from '@/lib/admin-handlers';
export const runtime = 'nodejs';
export async function POST(request: Request) { return handleAdminLogout(request); }
