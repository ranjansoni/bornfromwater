# Poynt merchant callback

Register this exact OAuth Callback URL in the existing Cloud App:

`https://www.bornfromwater.ca/api/poynt/oauth/callback`

Before authorization, configure `POYNT_APPLICATION_ID` and the **expected live Canadian**
`POYNT_BUSINESS_ID` on the deployment receiving the callback. Missing configuration fails
closed. The callback does not discover or replace the expected merchant ID; obtain it
from the live merchant account or Poynt support first. The route exists only after a
separately authorized deployment. No deployment is part of this change.

The server accepts only `code`, `status`, optional `context`, and legacy `businessId`.
Duplicate and unexpected parameters are rejected. Only the signed JWT establishes
identity; unsigned status/context do not grant authorization. RS256, issuer, expiry,
issued-at, optional not-before/audience, application subject, and `poynt.biz` are checked.
An optional legacy businessId must agree with the signed merchant identity.

Following Poynt's current published instructions, the public key is retrieved from the
certificate at the fixed `poynt.net:443` host with hostname and certificate-chain
verification enabled. Retrieval times out after five seconds; a successful public key
is cached for at most five minutes or until certificate expiry. No key from JWT headers
is trusted and no old documentation sample key is embedded. If Poynt changes its signing
scheme or the TLS certificate no longer matches the signing key, verification fails
closed; ask Poynt for its updated signing-key mechanism rather than bypassing validation.

The callback does not log or store the JWT, establish a login session, change configuration,
or touch payments/orders. No OAuth state cookie is needed for this informational callback:
it cannot link a different account or change state, and both expected identities are fixed
server-side. A replay within the JWT lifetime only repeats the informational result.

Both outcomes redirect to fixed paths with no callback parameters, no-store, and
no-referrer. Result documents have no analytics, scripts, or external resources. Visiting
the success path directly is not proof of authorization or payment.

Hosting/access logs are outside this handler's control. Before using live authorization,
ensure the host or any proxy does not retain callback query strings; never share the full
callback URL. Application code cannot prevent an upstream host from logging an incoming URL.

Reference: https://docs.poynt.com/app-integration/cloudApps/merchant-authorization.html
