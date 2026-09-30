import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../next.config.ts';

test('checkout headers block third-party analytics and signed-token referrers', async () => {
  const routes = await config.headers();
  const checkout = routes.find(route => route.source === '/checkout/:path*');
  const headers = Object.fromEntries(checkout.headers.map(header => [header.key, header.value]));
  const csp = headers['Content-Security-Policy'];
  assert.equal(headers['Referrer-Policy'], 'no-referrer');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /google-analytics|googletagmanager|analytics.google/);
  assert.doesNotMatch(csp, /default-src \*/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});

test('owner pages and APIs disallow indexing, caching, analytics and referrer leakage', async () => {
  const routes = await config.headers();
  for (const source of ['/admin/:path*', '/api/admin/:path*']) {
    const route = routes.find(route => route.source === source);
    const headers = Object.fromEntries(route.headers.map(header => [header.key, header.value]));
    assert.equal(headers['Cache-Control'], 'private, no-store');
    assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow, noarchive');
    assert.equal(headers['Referrer-Policy'], 'no-referrer');
    assert.doesNotMatch(headers['Content-Security-Policy'], /google-analytics|googletagmanager/);
  }
});
