import test from "node:test";
import assert from "node:assert/strict";
import {
  DuplicatePaymentError,
  InvalidOrderAmountError,
  processOrderPayment,
} from "../src/lib/checkout-service.ts";

function pendingOrder(overrides = {}) {
  return {
    orderId: "11111111-1111-4111-8111-111111111111",
    totalCents: 6500,
    currency: "CAD",
    paymentStatus: "pending",
    godaddyTransactionId: null,
    ...overrides,
  };
}

function store({ canClaim = true } = {}) {
  const calls = [];
  return {
    calls,
    async claim(orderId) {
      calls.push(["claim", orderId]);
      return canClaim;
    },
    async approve(orderId, transactionId) {
      calls.push(["approve", orderId, transactionId]);
    },
    async decline(orderId) {
      calls.push(["decline", orderId]);
    },
  };
}

test("records an approved checkout", async () => {
  const paymentStore = store();
  const result = await processOrderPayment(pendingOrder(), 6500, paymentStore, async () => ({
    outcome: "approved",
    transactionId: "poynt-transaction-1",
    totalCents: 6500,
    currency: "CAD",
  }));

  assert.equal(result.outcome, "approved");
  assert.deepEqual(paymentStore.calls.map(([name]) => name), ["claim", "approve"]);
});

test("records a declined checkout without approving it", async () => {
  const paymentStore = store();
  const result = await processOrderPayment(
    pendingOrder(),
    6500,
    paymentStore,
    async () => ({ outcome: "declined" }),
  );

  assert.deepEqual(result, { outcome: "declined" });
  assert.deepEqual(paymentStore.calls.map(([name]) => name), ["claim", "decline"]);
});

test("rejects an order whose stored amount differs from the catalogue", async () => {
  const paymentStore = store();
  let chargeCalled = false;

  await assert.rejects(
    processOrderPayment(pendingOrder(), 6000, paymentStore, async () => {
      chargeCalled = true;
      return { outcome: "declined" };
    }),
    InvalidOrderAmountError,
  );
  assert.equal(chargeCalled, false);
  assert.equal(paymentStore.calls.length, 0);
});

test("prevents a second charge when the atomic order claim fails", async () => {
  const paymentStore = store({ canClaim: false });
  let chargeCalled = false;

  await assert.rejects(
    processOrderPayment(pendingOrder(), 6500, paymentStore, async () => {
      chargeCalled = true;
      return { outcome: "declined" };
    }),
    DuplicatePaymentError,
  );
  assert.equal(chargeCalled, false);
  assert.deepEqual(paymentStore.calls.map(([name]) => name), ["claim"]);
});
