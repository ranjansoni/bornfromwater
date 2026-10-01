import 'server-only';
import { adminConfiguration, adminRequestToken, validAdminOrigin, verifyAdminSession } from './admin-auth';
import { catalog, CatalogConflictError } from './catalog-store';
import { CatalogInputError, validateCatalogUpdate } from './catalog-management';

const defaults = { config: adminConfiguration, update: catalog.update };
const json = (body: unknown, status = 200) => Response.json(body, { status,
  headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
export async function handleCatalogUpdate(request: Request, slug: string, deps = defaults) {
  try {
    const config = deps.config();
    if (!verifyAdminSession(adminRequestToken(request), config)) return json({ error: 'Please sign in again.' }, 401);
    if (!validAdminOrigin(request, config)) return json({ error: 'Invalid request.' }, 403);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return json({ error: 'Product not found.' }, 404);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new CatalogInputError('Invalid request.');
    const raw = await request.text();
    if (raw.length > 30000) throw new CatalogInputError('The product update is too large.');
    let body;
    try { body = JSON.parse(raw); } catch { throw new CatalogInputError('Invalid request.'); }
    const product = await deps.update(slug, validateCatalogUpdate(body));
    return json({ product });
  } catch (error) {
    if (error instanceof CatalogInputError) return json({ error: error.message }, 400);
    if (error instanceof CatalogConflictError) return json({ error: error.message }, 409);
    return json({ error: 'The product could not be saved. Please try again.' }, 503);
  }
}
