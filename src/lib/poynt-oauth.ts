import { constants, verify, type KeyObject } from "node:crypto";

type Configuration = { applicationId?: string; businessId?: string };

// Verification has no side effects. Never return claims, codes, or exception text to a client.
export async function verifyPoyntCallback(
  parameters: URLSearchParams,
  configuration: Configuration,
  publicKey: () => Promise<KeyObject>,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  try {
    const allowed = new Set(["code", "status", "context", "businessId"]);
    for (const [name, value] of parameters) {
      if (!allowed.has(name) || parameters.getAll(name).length !== 1 || value.length > 8192) return false;
    }
    if (!configuration.applicationId || !configuration.businessId) return false;
    const code = parameters.get("code");
    if (!code || code.length > 8192) return false;
    const parts = code.split(".");
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    if (header?.alg !== "RS256" || header.crit !== undefined || header.jku !== undefined ||
        header.jwk !== undefined || header.x5u !== undefined) return false;
    const key = await publicKey();
    if (key.asymmetricKeyType !== "rsa") return false;
    if (!verify("RSA-SHA256", Buffer.from(`${headerPart}.${payloadPart}`),
      { key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(signaturePart, "base64url"))) return false;

    const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    if (claims?.iss !== "https://poynt.net" || claims.sub !== configuration.applicationId ||
        claims["poynt.biz"] !== configuration.businessId) return false;
    if (!Number.isSafeInteger(claims.exp) || claims.exp <= now ||
        !Number.isSafeInteger(claims.iat) || claims.iat > now + 30 || claims.iat >= claims.exp) return false;
    if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now)) return false;
    if (claims.aud !== undefined && claims.aud !== configuration.applicationId) return false;
    // Legacy query data must never override the signed merchant identity.
    if (parameters.has("businessId") && parameters.get("businessId") !== configuration.businessId) return false;
    // status/context are unsigned metadata; only the verified JWT establishes identity.
    return true;
  } catch {
    return false;
  }
}

export function poyntCallbackRedirect(success: boolean): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/poynt/authorization/${success ? "success" : "error"}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
