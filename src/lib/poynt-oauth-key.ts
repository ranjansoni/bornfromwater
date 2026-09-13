import "server-only";
import { X509Certificate, type KeyObject } from "node:crypto";
import { connect } from "node:tls";

let cached: { key: KeyObject; until: number } | undefined;

// Poynt documents the TLS certificate public key for its authorization-code signature:
// https://docs.poynt.com/app-integration/cloudApps/merchant-authorization.html
// Never use a URL or key supplied by the callback/JWT header.
export async function currentPoyntAuthorizationKey(): Promise<KeyObject> {
  if (cached && cached.until > Date.now()) return cached.key;
  return new Promise((resolve, reject) => {
    const socket = connect({
      host: "poynt.net", port: 443, servername: "poynt.net", rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    });
    const fail = () => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error("Poynt authorization verification unavailable."));
    };
    const timer = setTimeout(fail, 5000);
    socket.once("error", fail);
    socket.once("secureConnect", () => {
      try {
        if (!socket.authorized) return fail();
        const certificate = new X509Certificate(socket.getPeerCertificate().raw);
        const expires = Date.parse(certificate.validTo);
        if (expires <= Date.now() || certificate.publicKey.asymmetricKeyType !== "rsa") return fail();
        cached = { key: certificate.publicKey, until: Math.min(Date.now() + 300_000, expires) };
        clearTimeout(timer);
        socket.destroy();
        resolve(cached.key);
      } catch { fail(); }
    });
  });
}
