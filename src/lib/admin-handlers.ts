import 'server-only';
import { adminConfiguration, adminCookie, adminRequestToken, checkAdminPassword, createAdminSession,
  validAdminOrigin, verifyAdminSession } from './admin-auth';
import { adminOrders, OrderConflictError } from './admin-order-store';
import { OrderInputError, validateFulfillmentUpdate } from './order-management';
import { stripeConfiguration } from './stripe-config';
import { isUuid } from './orders';

const defaults = { config: adminConfiguration, scope: stripeConfiguration,
  consumeLoginAttempt: adminOrders.consumeLoginAttempt, updateFulfillment: adminOrders.updateFulfillment,
  setOrderDeleted: adminOrders.setOrderDeleted };
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', ...headers } });
}
async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new OrderInputError('Invalid request.');
  const raw = await request.text();
  if (raw.length > 16000) throw new OrderInputError('The order update is too large.');
  try { return JSON.parse(raw); } catch { throw new OrderInputError('Invalid request.'); }
}
export async function handleAdminLogin(request: Request, deps = defaults) {
  try {
    const config = deps.config();
    if (!validAdminOrigin(request, config)) return json({ error: 'Please sign in from the shop website.' }, 403);
    if (!await deps.consumeLoginAttempt()) return json({ error: 'Too many attempts. Please try again in 15 minutes.' }, 429, { 'Retry-After': '900' });
    const body = await readBody(request);
    if (!await checkAdminPassword(body?.password, config)) return json({ error: 'That password was not accepted.' }, 401);
    return json({ ok: true }, 200, { 'Set-Cookie': adminCookie(createAdminSession(config), config) });
  } catch (error) {
    return json({ error: error instanceof OrderInputError ? error.message : 'Sign-in is temporarily unavailable.' }, error instanceof OrderInputError ? 400 : 503);
  }
}
export async function handleAdminLogout(request: Request, deps = defaults) {
  try {
    const config = deps.config();
    if (!validAdminOrigin(request, config)) return json({ error: 'Invalid request.' }, 403);
    return json({ ok: true }, 200, { 'Set-Cookie': adminCookie('', config, 0) });
  } catch { return json({ error: 'Sign-out is temporarily unavailable.' }, 503); }
}
export async function handleOrderUpdate(request: Request, orderId: string, deps = defaults) {
  try {
    const config = deps.config();
    if (!verifyAdminSession(adminRequestToken(request), config)) return json({ error: 'Please sign in again.' }, 401);
    if (!validAdminOrigin(request, config)) return json({ error: 'Invalid request.' }, 403);
    if (!isUuid(orderId)) return json({ error: 'Order not found.' }, 404);
    const update = validateFulfillmentUpdate(await readBody(request));
    const version = await deps.updateFulfillment(orderId, update, deps.scope());
    return json({ ok: true, version });
  } catch (error) {
    if (error instanceof OrderInputError) return json({ error: error.message }, 400);
    if (error instanceof OrderConflictError) return json({ error: error.message }, 409);
    return json({ error: 'The order could not be saved. Please try again.' }, 503);
  }
}
export async function handleOrderDeletion(request: Request, orderId: string, deps = defaults) {
  try {
    const config = deps.config();
    if (!verifyAdminSession(adminRequestToken(request), config)) return json({ error: 'Please sign in again.' }, 401);
    if (!validAdminOrigin(request, config)) return json({ error: 'Invalid request.' }, 403);
    if (!isUuid(orderId)) return json({ error: 'Order not found.' }, 404);
    const body = await readBody(request);
    if (typeof body?.deleted !== 'boolean' || !Number.isSafeInteger(body?.version) || body.version < 0 || body.version > 2147483646) {
      throw new OrderInputError('Invalid order update.');
    }
    const version = await deps.setOrderDeleted(orderId, body.deleted, body.version, deps.scope());
    return json({ ok: true, version });
  } catch (error) {
    if (error instanceof OrderInputError) return json({ error: error.message }, 400);
    if (error instanceof OrderConflictError) return json({ error: error.message }, 409);
    return json({ error: 'The order visibility could not be changed. Please refresh and try again.' }, 503);
  }
}
