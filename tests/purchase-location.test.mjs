import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { purchaseEligibility } from '../src/lib/purchase-location.ts';
import { CANADA_ONLY_MESSAGE, LOCATION_UNAVAILABLE_MESSAGE } from '../src/lib/purchase-policy.ts';
import { handleCheckout } from '../src/lib/checkout-handler.ts';
import { handleCartActivity } from '../src/lib/cart-activity-handler.ts';
import { vercelPurchaseEligibility } from './fixtures.mjs';

const headers = country => new Headers(country === undefined ? {} : { 'x-vercel-ip-country': country });

test('only a Canadian Vercel country is eligible; unknown and malformed locations fail closed', () => {
  assert.deepEqual(vercelPurchaseEligibility(headers('CA')), { allowed: true, message: null });
  for (const country of ['US', 'GB', 'IN', 'AU', 'FR']) {
    assert.deepEqual(vercelPurchaseEligibility(headers(country)), { allowed: false, message: CANADA_ONLY_MESSAGE });
  }
  for (const country of [undefined, '', 'XX', 'ca', 'Canada', 'CA, US', 'US, CA']) {
    assert.deepEqual(vercelPurchaseEligibility(headers(country)), { allowed: false, message: LOCATION_UNAVAILABLE_MESSAGE });
  }
});

test('browser language, forwarded countries and non-Vercel headers cannot grant permission', () => {
  const spoofed = new Headers({ 'cf-ipcountry': 'CA', 'x-country': 'CA', 'x-forwarded-for': '142.112.0.1', 'accept-language': 'en-CA' });
  assert.equal(vercelPurchaseEligibility(spoofed).allowed, false);
  assert.equal(purchaseEligibility(headers('CA'), { NODE_ENV: 'production' }).allowed, false);
  assert.equal(purchaseEligibility(headers('CA'), {}).allowed, false);
  assert.equal(purchaseEligibility(headers('CA'), { VERCEL: '0', NODE_ENV: 'production' }).allowed, false);
});

test('only local next dev skips edge geolocation; deployed development and preview still require Canada', () => {
  assert.equal(purchaseEligibility(headers(), { NODE_ENV: 'development' }).allowed, true);
  for (const env of [
    { NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview' },
    { NODE_ENV: 'development', VERCEL: '1', VERCEL_ENV: 'development' },
    { NODE_ENV: 'development', VERCEL_ENV: 'preview' },
  ]) assert.equal(purchaseEligibility(headers(), env).allowed, false);
});

test('blocked checkout and observation requests have no database, order or Stripe side effects', async () => {
  let calls = 0;
  const forbidden = () => { calls++; throw new Error('Must not access downstream services'); };
  const deps = { purchaseEligibility: vercelPurchaseEligibility, getCatalog: forbidden, getOrderByCheckoutRequest: forbidden,
    createPendingOrder: forbidden, checkoutDestination: forbidden, stripeConfiguration: forbidden,
    signingSecret: forbidden, trackCartCheckout: forbidden, scope: forbidden, snapshot: forbidden,
    allowObservation: forbidden, observe: forbidden };
  for (const country of ['US', 'IN', undefined, 'CA, US']) {
    // Even an invalid body is rejected by location first, before any downstream work.
    const request = path => new Request(`https://shop.example${path}?country=CA`, {
      method: 'POST', headers: headers(country), body: 'invalid JSON',
    });
    const checkout = await handleCheckout(request('/api/checkout'), deps);
    assert.equal(checkout.status, 403);
    assert.equal(checkout.headers.get('cache-control'), 'private, no-store');
    assert.equal((await checkout.json()).code, 'CANADA_ONLY');
    const observation = await handleCartActivity(request('/api/cart-activity'), deps);
    assert.equal(observation.status, 403);
    assert.deepEqual(await observation.json(), { ok: false });
  }
  assert.equal(calls, 0);
});

test('Canadian checkout passes the location guard and still validates its body', async () => {
  const request = new Request('https://shop.example/api/checkout', { method: 'POST', headers: headers('CA'), body: '{}' });
  const response = await handleCheckout(request, { purchaseEligibility: vercelPurchaseEligibility });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid checkout request.' });
});

test('the initial storefront disables purchase controls outside Canada without hiding products', () => {
  // Render client components under normal React conditions, independently of the
  // server-only conditions used by the API/database test suite.
  const rendered = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { StoreShell } from './src/components/StoreShell.tsx';
    import { AddToCartButton } from './src/components/AddToCartButton.tsx';
    import { products } from './src/lib/catalog-seed.ts';
    import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
    const render = allowed => renderToStaticMarkup(React.createElement(PathnameContext.Provider, { value: '/' }, React.createElement(StoreShell, {
      products, purchaseEligibility: { allowed, message: allowed ? null : 'Shopping is currently available only to customers in Canada.' }
    }, React.createElement('section', null, React.createElement('h1', null, products[0].name), React.createElement(AddToCartButton, { slug: products[0].slug })))));
    console.log(JSON.stringify({ canada: render(true), blocked: render(false) }));
  `], { encoding: 'utf8' }));
  assert.match(rendered.blocked, /New Beginnings Bracelet/);
  assert.match(rendered.blocked, /Shopping is currently available only to customers in Canada/);
  assert.match(rendered.blocked, /<button[^>]*disabled=""[^>]*>Canada only<\/button>/);
  assert.doesNotMatch(rendered.canada, /Canada only|Shopping is currently available only/);
  assert.match(rendered.canada, /<button(?![^>]*\sdisabled=)[^>]*>Add to cart<\/button>/);
});
