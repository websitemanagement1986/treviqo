# PayMate backend certificate (Treviqo)

PayMate support asked to **replace the `.crt` file** and **configure the updated certificate on your backend** after UPI activation.

## Certificate file

| Item | Location |
|------|----------|
| PayMate `paymate.in` TLS cert | `certs/paymate.in.crt` |
| Override path | Env `PAYMATE_CERT_PATH` (relative to project root or absolute) |

Valid: **21 Oct 2026 – 7 May 2027** (CN `paymate.in`).

## Hostinger (Node.js Web App)

1. Use **Option A — Node.js Web App** in `HOSTINGER.md` (`npm run build` + `npm start`).  
   **Do not** use `npm run build:hostinger` for PayMate — static export has no API routes.
2. Redeploy from GitHub `main` so `certs/paymate.in.crt` is on the server.
3. Environment variables:
   - `SITE=treviqo`
   - `PAYMATE_CERT_PATH=certs/paymate.in.crt`
   - Optional on Linux/Node hosts: `NODE_EXTRA_CA_CERTS=certs/paymate.in.crt` (extends default CAs with PayMate’s cert)
   - Merchant API keys from PayMate **Account Settings → API Settings** (when you wire payment APIs).

## Verify after deploy

```http
GET /api/paymate/tls-check
```

Returns `ok: true` if the cert loads and HTTPS to PayMate succeeds.

For production, set `PAYMATE_TLS_CHECK_SECRET` and call:

```http
GET /api/paymate/tls-check?secret=<your-secret>
```

## Code usage

Server routes should use `getPaymateHttpsAgent()` from `src/lib/paymate/tls.ts` for HTTPS calls to PayMate so TLS uses the updated certificate.

Checkout UI (UPI / gateway) is still separate — enable `CheckoutForm` gateway flow once create-order / callback routes are added.
