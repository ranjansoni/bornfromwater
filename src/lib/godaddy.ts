import "server-only";

import { createPrivateKey, randomUUID, sign } from "node:crypto";
import type { GatewayResult } from "@/lib/checkout-service";
import type { StoredOrder } from "@/lib/order-store";
import { previewChargeDiagnostic } from "@/lib/poynt-diagnostics";
import { paymentCurrency } from "@/lib/payment-currency";

type PoyntConfig = {
  applicationId: string;
  businessId: string;
  storeId: string;
  privateKey: string;
  apiBaseUrl: string;
  collectSdkUrl: string;
};

type TokenResponse = {
  accessToken?: string;
  expiresIn?: number;
};

type ChargeResponse = {
  id?: string;
  status?: string;
  amounts?: { transactionAmount?: number; currency?: string };
  processorResponse?: { status?: string; transactionId?: string };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function config(): PoyntConfig {
  const environment = process.env.POYNT_ENVIRONMENT;
  const applicationId = process.env.POYNT_APPLICATION_ID;
  const businessId = process.env.POYNT_BUSINESS_ID;
  const storeId = process.env.POYNT_STORE_ID;
  const privateKey = process.env.POYNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!applicationId || !businessId || !storeId || !privateKey) {
    throw new Error("GoDaddy Poynt is not configured.");
  }
  if (environment !== "production" && environment !== "ote") {
    throw new Error("POYNT_ENVIRONMENT must be production or ote.");
  }
  if (process.env.VERCEL_ENV === "production" && environment !== "production") {
    throw new Error("Production checkout requires the Poynt production environment.");
  }

  return {
    applicationId,
    businessId,
    storeId,
    privateKey,
    apiBaseUrl:
      environment === "production"
        ? "https://services.poynt.net"
        : "https://services-ote.poynt.net",
    collectSdkUrl:
      environment === "production"
        ? "https://collect.commerce.godaddy.com/sdk.js"
        : "https://collect.commerce.ote-godaddy.com/sdk.js",
  };
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function selfSignedJwt(settings: PoyntConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    exp: now + 300,
    iat: now,
    iss: settings.applicationId,
    sub: settings.applicationId,
    aud: settings.apiBaseUrl,
    jti: randomUUID(),
  })}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), createPrivateKey(settings.privateKey));
  return `${unsigned}.${signature.toString("base64url")}`;
}

async function accessToken(settings: PoyntConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const response = await fetch(`${settings.apiBaseUrl}/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "api-version": "1.2",
      "Poynt-Request-Id": randomUUID(),
    },
    body: new URLSearchParams({
      grantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: selfSignedJwt(settings),
    }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.accessToken) {
    console.error("Poynt access-token request failed", { status: response.status });
    throw new Error("Secure payment authentication is temporarily unavailable.");
  }

  cachedToken = {
    value: body.accessToken,
    expiresAt: Date.now() + Math.max(60, body.expiresIn ?? 300) * 1000,
  };
  return body.accessToken;
}

export function collectConfiguration(): {
  applicationId: string;
  businessId: string;
  sdkUrl: string;
} {
  const settings = config();
  return {
    applicationId: settings.applicationId,
    businessId: settings.businessId,
    sdkUrl: settings.collectSdkUrl,
  };
}

export async function chargeNonce(nonce: string, order: StoredOrder): Promise<GatewayResult> {
  if (order.currency !== paymentCurrency()) {
    throw new Error("This order uses a different payment currency. Start a new checkout.");
  }
  const settings = config();
  const token = await accessToken(settings);
  let response: Response;

  try {
    response = await fetch(
      `${settings.apiBaseUrl}/businesses/${encodeURIComponent(settings.businessId)}/cards/tokenize/charge`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "api-version": "1.2",
          "Poynt-Request-Id": order.checkoutRequestId,
        },
        body: JSON.stringify({
          action: "SALE",
          context: { businessId: settings.businessId, storeId: settings.storeId },
          amounts: {
            transactionAmount: order.totalCents,
            orderAmount: order.totalCents,
            currency: order.currency,
          },
          fundingSource: { nonce },
        }),
        cache: "no-store",
      },
    );
  } catch {
    console.error("Poynt charge request ended without a response", { orderId: order.orderId });
    throw new Error("Payment status is uncertain. Please do not try again yet.");
  }

  const body = (await response.json().catch(() => ({}))) as ChargeResponse & {
    code?: string;
    errorCode?: string;
  };
  const status = body.status?.toUpperCase();
  const processorStatus = body.processorResponse?.status?.toUpperCase();

  if (!response.ok || status === "DECLINED" || processorStatus === "DECLINED") {
    const diagnostic = previewChargeDiagnostic(
      process.env.VERCEL_ENV,
      response.status,
      body,
      order.checkoutRequestId,
      [nonce, token, settings.privateKey, process.env.POYNT_PRIVATE_KEY,
        process.env.DATABASE_URL, process.env.ORDER_SIGNING_SECRET],
    );
    if (diagnostic) console.error("Poynt SALE Preview diagnostic", diagnostic);
    if (response.status >= 500) {
      console.error("Poynt charge request returned an uncertain error", {
        orderId: order.orderId,
        status: response.status,
        code: body.code ?? body.errorCode,
      });
      throw new Error("Payment status is uncertain. Please do not try again yet.");
    }
    return { outcome: "declined" };
  }

  const approved = new Set(["AUTHORIZED", "APPROVED", "CAPTURED", "COMPLETED"]);
  if (!status || !approved.has(status)) {
    console.error("Poynt returned an unknown payment status", { orderId: order.orderId, status });
    throw new Error("Payment status is uncertain. Please do not try again yet.");
  }

  const transactionId = body.id ?? body.processorResponse?.transactionId;
  return {
    outcome: "approved",
    transactionId: transactionId ?? "",
    totalCents: body.amounts?.transactionAmount ?? -1,
    currency: body.amounts?.currency ?? "",
  };
}
