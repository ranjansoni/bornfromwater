import 'server-only';
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const sessionLifetime = 12 * 60 * 60;
export function adminCookieName(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === 'production' ? '__Host-bfw-admin' : 'bfw-admin';
}
export function adminConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const hash = env.ADMIN_PASSWORD_HASH ?? '';
  const secret = env.ADMIN_SESSION_SECRET ?? '';
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash) || secret.length < 32) {
    throw new Error('Admin access is not configured.');
  }
  const origin = new URL(env.APP_URL ?? 'http://localhost:3000');
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
      (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === 'localhost'))) {
    throw new Error('Admin origin is not configured.');
  }
  const origins = [origin.origin];
  if (env.VERCEL_URL && /^[a-z0-9.-]+\.vercel\.app$/.test(env.VERCEL_URL)) origins.push(`https://${env.VERCEL_URL}`);
  return { hash, secret, origins, secure: env.NODE_ENV === 'production' };
}
export async function hashAdminPassword(password: string) {
  if (password.length < 16 || password.length > 256) throw new Error('Use a password of 16–256 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function checkAdminPassword(password: unknown, config = adminConfiguration()) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) return false;
  const [, salt, expected] = config.hash.split(':');
  const actual = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
function credentialVersion(config: ReturnType<typeof adminConfiguration>) {
  return createHash('sha256').update(config.hash).digest('hex');
}
export function createAdminSession(config = adminConfiguration(), now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ v: 1, scope: 'orders-admin', iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + sessionLifetime, credential: credentialVersion(config) })).toString('base64url');
  return `${body}.${createHmac('sha256', config.secret).update(body).digest('base64url')}`;
}
export function verifyAdminSession(token: string | undefined, config = adminConfiguration(), now = Date.now()) {
  if (!token || token.length > 1000) return false;
  try {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
    const expected = createHmac('sha256', config.secret).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return false;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    return data.v === 1 && data.scope === 'orders-admin' && Number.isInteger(data.exp) && Number.isInteger(data.iat) &&
      data.iat <= seconds && data.exp > seconds && data.exp - data.iat === sessionLifetime &&
      data.credential === credentialVersion(config);
  } catch { return false; }
}
export function adminRequestToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${adminCookieName()}=`))?.split('=')[1];
}
export function validAdminOrigin(request: Request, config = adminConfiguration()) {
  return config.origins.includes(request.headers.get('origin') ?? '') &&
    request.headers.get('sec-fetch-site') !== 'cross-site';
}
export function adminCookie(value: string, config = adminConfiguration(), maxAge = sessionLifetime) {
  return `${adminCookieName()}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.secure ? '; Secure' : ''}`;
}
