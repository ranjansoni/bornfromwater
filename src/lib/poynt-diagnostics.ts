// Temporary diagnostics: callers must never log the original response or request.
export function previewChargeDiagnostic(
  environment: string | undefined,
  httpStatus: number,
  responseBody: unknown,
  requestId: string,
  secrets: readonly (string | undefined)[],
) {
  if (environment !== "preview") return null;

  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  const body = record(responseBody);
  const processor = record(body.processorResponse);
  const error = record(body.error);

  function safe(value: unknown, message = false): string | null {
    if (typeof value !== "string" && typeof value !== "number") return null;
    let text = String(value);
    // Even allowlisted messages can echo a submitted secret or card data.
    for (const secret of secrets) {
      if (secret) text = text.split(secret).join("[redacted]");
    }
    if (/-----BEGIN|:\/\/|\bBearer\s|\beyJ[A-Za-z0-9_-]*\./i.test(text)) {
      return "[sensitive message withheld]";
    }
    if (/\b(?:nonce|cvv|cvc|pan|password|private.?key|access.?token|card.?number)\s*[=:]/i.test(text)) {
      return "[sensitive message withheld]";
    }
    text = text.replace(/(?:\d[ -]?){12,19}/g, "[redacted]");
    if (message) {
      text = text.replace(/\b\d{1,2}\s*\/\s*\d{2,4}\b/g, "[redacted]")
        .replace(/\d{3,}/g, "[redacted]");
    }
    return text
      .replace(/[\r\n\t\u0000-\u001f\u007f]/g, " ").slice(0, 300);
  }

  return {
    httpStatus,
    errorCode: safe(body.code ?? body.errorCode ?? error.code),
    apiMessage: safe(body.message ?? body.errorMessage ?? error.message, true),
    processorResponseCode: safe(processor.statusCode),
    processorMessage: safe(processor.statusMessage, true),
    transactionStatus: safe(body.status),
    processorStatus: safe(processor.status),
    transactionId: safe(body.id),
    processorTransactionId: safe(processor.transactionId),
    requestId: safe(requestId),
  };
}
