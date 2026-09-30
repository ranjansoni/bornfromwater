import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { orderId, checkoutId } from './fixtures.mjs';

test('additive migration is repeatable and preserves historical records byte-for-byte', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE orders (
      order_id uuid PRIMARY KEY, validated_cart jsonb NOT NULL, total_cents integer NOT NULL CHECK (total_cents > 0),
      currency char(3) NOT NULL CHECK (currency IN ('CAD', 'USD')),
      payment_status text NOT NULL CHECK (payment_status IN ('pending', 'processing', 'approved', 'declined')),
      checkout_request_id uuid NOT NULL UNIQUE, godaddy_transaction_id text UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());`);
    await db.query(`INSERT INTO orders VALUES ($1, $2::jsonb, 6500, 'USD', 'approved', $3, 'poynt-original', now(), now())`, [orderId, JSON.stringify([{ sku: 'ORIGINAL', quantity: 1, unitPriceCents: 6500 }]), checkoutId]);
    const columns = 'order_id, validated_cart, total_cents, currency, payment_status, checkout_request_id, godaddy_transaction_id, created_at, updated_at';
    const before = (await db.query(`SELECT ${columns} FROM orders`)).rows;
    const migration = await readFile(new URL('../src/db/migrations/001-stripe-checkout.sql', import.meta.url), 'utf8');
    await db.exec(migration); await db.exec(migration);
    assert.deepEqual((await db.query(`SELECT ${columns} FROM orders`)).rows, before);
    const row = (await db.query('SELECT * FROM orders')).rows[0];
    assert.equal(row.payment_provider, 'godaddy'); assert.equal(row.stripe_session_id, null); assert.equal(row.stripe_account_id, null);
  } finally { await db.close(); }
});
