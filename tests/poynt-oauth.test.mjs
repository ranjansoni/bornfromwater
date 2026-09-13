import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyPoyntCallback, poyntCallbackRedirect } from "../src/lib/poynt-oauth.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const configuration = { applicationId: "urn:aid:test-app", businessId: "expected-live-business" };
const now = 1800000000;
function token(claims = {}, header = { alg: "RS256", typ: "JWT" }) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode(header)}.${encode({ iss: "https://poynt.net", sub: configuration.applicationId,
    "poynt.biz": configuration.businessId, iat: now - 10, exp: now + 300, ...claims })}`;
  return `${data}.${sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url")}`;
}
const parameters = (code = token()) => new URLSearchParams({ code });
const check = (params, config = configuration, key = async () => publicKey) =>
  verifyPoyntCallback(params, config, key, now);

test("accepts a correctly signed Poynt code matching expected app and business", async () => {
  const params = parameters();
  params.set("businessId", configuration.businessId);
  params.set("context", "optional-context");
  assert.equal(await check(params), true);
});

test("rejects signature tampering and a different signing key", async () => {
  const parts = token().split(".");
  parts[1] = Buffer.from(JSON.stringify({ sub: configuration.applicationId })).toString("base64url");
  assert.equal(await check(parameters(parts.join("."))), false);
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.equal(await check(parameters(), configuration, async () => other.publicKey), false);
});

test("rejects wrong issuer, app, merchant, audience, and invalid time claims", async () => {
  for (const claims of [{ iss: "https://attacker.example" }, { sub: "other-app" },
    { "poynt.biz": "other-business" }, { aud: "other-app" }, { exp: now },
    { exp: "1800000300" }, { iat: now + 60 }, { nbf: now + 60 }, { exp: null }]) {
    assert.equal(await check(parameters(token(claims))), false);
  }
});

test("rejects algorithm substitution and caller-supplied key locations", async () => {
  for (const header of [{ alg: "none" }, { alg: "HS256" },
    { alg: "RS256", jku: "https://attacker.example" }, { alg: "RS256", crit: ["custom"] }]) {
    assert.equal(await check(parameters(token({}, header))), false);
  }
});

test("rejects missing, malformed, oversized, duplicate, or unexpected callback parameters", async () => {
  for (const code of ["", "not-a-jwt", "x".repeat(8193)]) assert.equal(await check(parameters(code)), false);
  const duplicate = parameters(); duplicate.append("code", token());
  assert.equal(await check(duplicate), false);
  const unexpected = parameters(); unexpected.set("redirect", "https://attacker.example");
  assert.equal(await check(unexpected), false);
  const legacy = parameters(); legacy.set("businessId", "other-business");
  assert.equal(await check(legacy), false);
  assert.equal(await check(new URLSearchParams({ status: "success" })), false);
});

test("fails closed on missing configuration and key retrieval failure", async () => {
  assert.equal(await check(parameters(), {}), false);
  assert.equal(await check(parameters(), configuration, async () => { throw new Error("unavailable"); }), false);
});

test("redirects to fixed clean paths with no cache or referrer and no body", async () => {
  for (const success of [true, false]) {
    const response = poyntCallbackRedirect(success);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), `/poynt/authorization/${success ? "success" : "error"}`);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "");
  }
});
