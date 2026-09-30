import test from 'node:test';
import assert from 'node:assert/strict';
import { adminConfiguration, adminCookie, adminCookieName, hashAdminPassword, checkAdminPassword,
  createAdminSession, verifyAdminSession, validAdminOrigin, sessionLifetime } from '../src/lib/admin-auth.ts';
import { handleAdminLogin, handleAdminLogout, handleOrderUpdate } from '../src/lib/admin-handlers.ts';
import { orderId } from './fixtures.mjs';

const password = 'local-tests-only-password-very-long';
const hash = await hashAdminPassword(password);
const env = { ADMIN_PASSWORD_HASH: hash, ADMIN_SESSION_SECRET: 'local-tests-only-session-secret-with-32-characters', APP_URL: 'https://shop.example' };
const config = adminConfiguration(env);
const deps = { config: () => config, scope: () => ({ accountId: 'acct_test', livemode: false }),
  consumeLoginAttempt: async () => true, updateFulfillment: async () => 1 };
function request(path, body, headers = {}) {
  return new Request(`https://shop.example${path}`, { method: 'POST', headers: { origin: 'https://shop.example', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
test('owner password hashes verify without accepting a wrong or malformed credential', async () => {
  assert.equal(await checkAdminPassword(password, config), true);
  assert.equal(await checkAdminPassword('wrong-password-with-enough-length', config), false);
  assert.equal(await checkAdminPassword(null, config), false);
  assert.equal(await checkAdminPassword('x'.repeat(257), config), false);
  assert.throws(() => adminConfiguration({ ...env, ADMIN_PASSWORD_HASH: password }));
  assert.throws(() => adminConfiguration({ ...env, ADMIN_SESSION_SECRET: 'short' }));
});
test('sessions reject tampering, expiry, future issue times, and rotated credentials', () => {
  const now = Date.now(); const token = createAdminSession(config, now);
  assert.equal(verifyAdminSession(token, config, now), true);
  assert.equal(verifyAdminSession(token + '.extra', config, now), false);
  assert.equal(verifyAdminSession(token.replace(/^./, token[0] === 'a' ? 'b' : 'a'), config, now), false);
  assert.equal(verifyAdminSession(token, config, now + sessionLifetime * 1000), false);
  assert.equal(verifyAdminSession(token, config, now - 2000), false);
  assert.equal(verifyAdminSession(token, { ...config, secret: 'rotated-secret' }, now), false);
  assert.equal(verifyAdminSession(token, { ...config, hash: hash.replace('scrypt:', 'changed:') }, now), false);
  assert.equal(verifyAdminSession('not.a.session', config, now), false);
});
test('origin enforcement rejects forged hosts, absent origins and cross-site requests', () => {
  assert.equal(validAdminOrigin(request('/api/admin/login', {}), config), true);
  assert.equal(validAdminOrigin(request('/api/admin/login', {}, { origin: 'https://evil.example', host: 'shop.example' }), config), false);
  assert.equal(validAdminOrigin(request('/api/admin/login', {}, { origin: 'null' }), config), false);
  assert.equal(validAdminOrigin(request('/api/admin/login', {}, { 'sec-fetch-site': 'cross-site' }), config), false);
});
test('login sets a private cookie only for valid credentials and returns no credential data', async () => {
  const response = await handleAdminLogin(request('/api/admin/login', { password }), deps);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=43200/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal((await handleAdminLogin(request('/api/admin/login', { password: 'incorrect-long-password' }), deps)).status, 401);
  assert.equal((await handleAdminLogin(request('/api/admin/login', { password }, { origin: 'https://evil.example' }), deps)).status, 403);
  assert.equal((await handleAdminLogin(request('/api/admin/login', { password }), { ...deps, consumeLoginAttempt: async () => false })).status, 429);
  const unavailable = await handleAdminLogin(request('/api/admin/login', { password }), { ...deps, config: () => { throw new Error('secret-do-not-expose'); } });
  assert.equal(unavailable.status, 503); assert.doesNotMatch(await unavailable.text(), /secret-do-not-expose/);
});
test('production session cookies are secure and logout clears the cookie', async () => {
  assert.equal(adminCookieName({ NODE_ENV: 'production' }), '__Host-bfw-admin');
  assert.match(adminCookie('test', { ...config, secure: true }), /; Secure$/);
  const response = await handleAdminLogout(request('/api/admin/logout', {}), deps);
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await handleAdminLogout(request('/api/admin/logout', {}, { origin: 'https://evil.example' }), deps)).status, 403);
});
test('order mutation denies unauthenticated and cross-site requests before touching the database', async () => {
  let touched = false;
  const protectedDeps = { ...deps, updateFulfillment: async () => { touched = true; return 1; } };
  assert.equal((await handleOrderUpdate(request('/api/admin/orders/x', {}), orderId, protectedDeps)).status, 401);
  const cookie = `${adminCookieName()}=${createAdminSession(config)}`;
  assert.equal((await handleOrderUpdate(request('/api/admin/orders/x', {}, { cookie, origin: 'https://evil.example' }), orderId, protectedDeps)).status, 403);
  assert.equal((await handleOrderUpdate(request('/api/admin/orders/x', {}, { cookie }), 'not-an-order-id', protectedDeps)).status, 404);
  assert.equal(touched, false);
});
