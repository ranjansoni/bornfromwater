import test from "node:test";
import assert from "node:assert/strict";
import { paymentCurrency } from "../src/lib/payment-currency.ts";
import { processOrderPayment, InvalidOrderAmountError } from "../src/lib/checkout-service.ts";

test("USD requires Preview and explicit opt-in; production remains CAD", () => {
  assert.equal(paymentCurrency("preview", "true"), "USD");
  for (const env of ["production", "development", ""]) {
    assert.equal(paymentCurrency(env, "true"), "CAD");
  }
  assert.equal(paymentCurrency("preview", ""), "CAD");
});

test("USD test approval verifies amount and currency; CAD mode rejects USD before charging", async () => {
  const order = { orderId: "test", totalCents: 6500, currency: "USD", paymentStatus: "pending" };
  let charges = 0;
  let approved = 0;
  const store = { claim: async () => true, approve: async () => approved++, decline: async () => {} };
  const charge = async () => { charges++; return { outcome: "approved", transactionId: "test-tx", totalCents: 6500, currency: "USD" }; };
  await assert.rejects(processOrderPayment(order, 6500, store, charge), InvalidOrderAmountError);
  assert.equal(charges, 0);
  await processOrderPayment(order, 6500, store, charge, "USD");
  assert.equal(approved, 1);
  await assert.rejects(processOrderPayment(order, 6500, store, async () => ({
    outcome: "approved", transactionId: "test-tx", totalCents: 6500, currency: "CAD",
  }), "USD"), InvalidOrderAmountError);
  assert.equal(approved, 1);
});
