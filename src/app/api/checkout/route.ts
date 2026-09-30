import { handleCheckout } from "@/lib/checkout-handler";
export const runtime = "nodejs";
export const POST = (request: Request) => handleCheckout(request);
