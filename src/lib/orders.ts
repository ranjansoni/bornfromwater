import { createHmac, timingSafeEqual } from "node:crypto";
import { createHash } from "node:crypto";
import { getProduct, type Product } from "@/lib/products";

export type SubmittedCartItem = { slug: string; quantity: number };
export type ValidatedCartLine = {
  product: Product;
  quantity: number;
  lineTotalCents: number;
};

export type OrderToken = {
  version: 1;
  orderId: string;
  checkoutRequestId: string;
};

const MAX_LINES = 20;
const MAX_QUANTITY = 10;

export function validateCart(items: unknown): {
  lines: ValidatedCartLine[];
  totalCents: number;
  fingerprint: string;
} {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    throw new Error("The cart is empty or too large.");
  }

  const seen = new Set<string>();
  const lines = items.map((item): ValidatedCartLine => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("slug" in item) ||
      !("quantity" in item) ||
      typeof item.slug !== "string" ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY ||
      seen.has(item.slug)
    ) {
      throw new Error("The cart contains an invalid item.");
    }

    const product = getProduct(item.slug);
    if (!product || product.placeholder) {
      throw new Error("A cart item is no longer available.");
    }
    seen.add(item.slug);

    return {
      product,
      quantity: item.quantity,
      lineTotalCents: product.priceCents * item.quantity,
    };
  });

  const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents < 100) {
    throw new Error("The order total is invalid.");
  }

  const canonical = lines
    .map((line) => `${line.product.slug}:${line.quantity}:${line.product.priceCents}`)
    .sort()
    .join("|");
  const fingerprint = createHash("sha256").update(canonical).digest("hex");

  return { lines, totalCents, fingerprint };
}

function signingSecret(): string {
  const secret = process.env.ORDER_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ORDER_SIGNING_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function signOrderToken(order: OrderToken): string {
  const payload = Buffer.from(JSON.stringify(order)).toString("base64url");
  const signature = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOrderToken(token: string): OrderToken | null {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;

  const expectedSignature = createHmac("sha256", signingSecret())
    .update(payload)
    .digest();
  const supplied = Buffer.from(suppliedSignature, "base64url");
  if (
    supplied.length !== expectedSignature.length ||
    !timingSafeEqual(supplied, expectedSignature)
  ) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      value?.version !== 1 ||
      typeof value.orderId !== "string" ||
      typeof value.checkoutRequestId !== "string"
    ) {
      return null;
    }
    return value as OrderToken;
  } catch {
    return null;
  }
}
