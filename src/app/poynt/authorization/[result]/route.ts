// A plain result document avoids the storefront layout's analytics and client scripts.
export async function GET(_request: Request, context: { params: Promise<{ result: string }> }) {
  const { result } = await context.params;
  if (result !== "success" && result !== "error") return new Response(null, { status: 404 });
  const title = result === "success" ? "Merchant callback verified" : "Merchant callback could not be verified";
  const message = result === "success"
    ? "The callback matched the configured application and merchant. No payment was taken and no store configuration was changed."
    : "Check the Cloud App and expected merchant configuration, then restart authorization from Poynt Developer Center. No payment was taken.";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p><p>This informational page is not proof of payment or stored authorization.</p><a href="/">Return to Born From Water</a></main></body></html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
