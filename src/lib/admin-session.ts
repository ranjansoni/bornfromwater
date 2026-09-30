import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminCookieName, verifyAdminSession } from './admin-auth';

export async function isAdmin() {
  const token = (await cookies()).get(adminCookieName())?.value;
  try { return verifyAdminSession(token); } catch { return false; }
}
export async function requireAdmin() {
  if (!await isAdmin()) redirect('/admin/login');
}
