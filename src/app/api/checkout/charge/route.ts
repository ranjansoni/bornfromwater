// Old browser tabs must never execute another GoDaddy charge after cutover.
export function POST() {
  return Response.json({ error: "This payment form has been retired. Check your existing order status or contact the shop before paying again." }, { status: 410 });
}
