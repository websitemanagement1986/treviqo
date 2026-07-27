import { timingSafeEqual } from "crypto";

/**
 * External partner auth for /api/paymate/intent.
 * Accepts: Authorization: Bearer <key>  OR  X-API-Key: <key>
 */
export function authorizePartnerRequest(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const expected = (process.env.PAYMATE_PARTNER_API_KEY || "").trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "Partner API is not configured (PAYMATE_PARTNER_API_KEY missing)",
    };
  }

  const headerKey = req.headers.get("x-api-key")?.trim() || "";
  const auth = req.headers.get("authorization")?.trim() || "";
  const bearerKey = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = headerKey || bearerKey;

  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
