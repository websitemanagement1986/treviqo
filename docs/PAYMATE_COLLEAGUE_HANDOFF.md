# PayMate — handoff for colleague / merchant portal

Use this when your colleague configures the **PayMate merchant portal** and the merchant enables **redirect + callback**. Treviqo e-commerce already shows **order success** when PayMate confirms payment.

---

## 1. Certificate (backend) — done

| Item | Value |
|------|--------|
| File in repo | `certs/paymate.in.crt` |
| Hostinger env | `PAYMATE_CERT_PATH=certs/paymate.in.crt` |
| Verify after deploy | `GET https://treviqo.co.in/api/paymate/tls-check` → `"ok": true` |

Tell PayMate support: **updated `paymate.in` certificate is configured on Treviqo backend** (Node.js on Hostinger).

---

## 2. Give colleague / merchant portal (redirect & callback)

Register these on **PayMate** for merchant **Treviqo Traders (OPC) Pvt Ltd**:

| Setting | URL / value |
|---------|-------------|
| **Website / return URL** (customer browser after pay) | `https://treviqo.co.in/paymate-return` |
| **Server callback URL** (PayMate → Treviqo, POST) | `https://treviqo.co.in/api/paymate/callback` |
| **Outbound server IP** (API whitelist) | `92.113.19.150` — confirm via `GET https://treviqo.co.in/api/paymate/debug-ip` |
| **Business Xpress ID** | `YJFW000003` |
| **Reference code** (CollectPayments v2) | `TREVIQO01` |
| **Production API** | `https://paymate.in/PaymatePartnerStack/api/v2/CollectPayments` |

`ReturnURL` is also sent **per order** in the API payload (`…/paymate-return?orderId=TRV…`). Portal-level redirect rules can point to the same return base URL; merchant can align auto-redirect with the above.

**Do not share** partner private key or full API secrets in email — only PayMate portal / secure channel.

---

## 3. What Treviqo does for “success on ecom” (no extra dev needed)

Once PayMate returns success and/or hits our callback:

1. **Server callback** — `POST /api/paymate/callback` decrypts response, marks order **paid**, sends order emails (if Resend is configured).
2. **Customer return** — User lands on `/paymate-return?orderId=TRV…` → calls `/api/paymate/status` → **success page**, cart cleared, **order confirmation** data stored (same as COD flow).
3. **Checkout** — “Pay Online (PayMate UPI)” → `/api/paymate/create-order` → redirect to PayMate payment URL when PayMate returns a valid `PaymentURL`.

Colleague / merchant only needs portal redirect + callback + whitelist; **Treviqo handles success UI and emails**.

---

## 4. Portal access (for colleague)

If “portal access” means **PayMate merchant dashboard login**:

- That is the **Treviqo PayMate business account** (created at onboarding), not something generated in code.
- Share **PayMate portal URL** + **merchant login** with the colleague through your internal process (password manager / PayMate invite).

If it means **technical access to verify Treviqo**:

- Optional: `PAYMATE_DEBUG_KEY` on Hostinger, then `GET /api/paymate/debug?key=…` (smoke test CollectPayments).

---

## 5. Checklist before go-live

- [ ] Hostinger redeployed from `main` (includes `certs/paymate.in.crt`)
- [ ] `SITE=treviqo`, `SITE_URL=https://treviqo.co.in`, PayMate env vars set on Hostinger
- [ ] PayMate whitelisted **92.113.19.150**
- [ ] Callback + return URLs registered in merchant portal
- [ ] **UPI Intent** enabled for **TREVIQO01** (QRCode returns PayMate error `178` on this account)
- [ ] If Intent returns `999` / empty `PaymentURL`, PayMate must complete UPI activation on merchant profile
- [ ] Test: checkout → PayMate → pay → return → **success** on `treviqo.co.in`

---

*Site: https://treviqo.co.in | Repo: `websitemanagement1986/treviqo`*
