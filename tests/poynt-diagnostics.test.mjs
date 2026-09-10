import test from "node:test";
import assert from "node:assert/strict";
import { previewChargeDiagnostic } from "../src/lib/poynt-diagnostics.ts";

test("diagnostics are disabled outside Vercel Preview", () => {
  for (const environment of [undefined, "production", "development", "ote"]) {
    assert.equal(previewChargeDiagnostic(environment, 403, {}, "request", []), null);
  }
});

test("captures only allowlisted API and processor fields", () => {
  const result = previewChargeDiagnostic("preview", 403, {
    code: "FORBIDDEN", message: "Permission denied", id: "transaction-1",
    fundingSource: { nonce: "secret-nonce", card: { number: "4111111111111111" } },
    processorResponse: { statusCode: "05", statusMessage: "Do not honor", card: "secret" },
    accessToken: "secret-token",
  }, "request-1", []);
  assert.equal(result.httpStatus, 403);
  assert.equal(result.errorCode, "FORBIDDEN");
  assert.equal(result.processorResponseCode, "05");
  assert.equal(result.processorMessage, "Do not honor");
  assert.equal(result.requestId, "request-1");
  assert.doesNotMatch(JSON.stringify(result), /secret|4111111111111111|fundingSource|accessToken/);
});

test("redacts secrets echoed in allowlisted fields and rejects structured values", () => {
  const result = previewChargeDiagnostic("preview", 400, {
    code: { nonce: "hidden" },
    message: "Invalid secret-nonce for 4111 1111 1111 1111",
    processorResponse: { statusMessage: "cvv=123" },
  }, "request-1", ["secret-nonce"]);
  assert.equal(result.errorCode, null);
  assert.equal(result.apiMessage, "Invalid [redacted] for [redacted]");
  assert.equal(result.processorMessage, "[sensitive message withheld]");
});
