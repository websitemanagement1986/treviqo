import { NextResponse } from "next/server";
import {
  getPaymateCertPath,
  paymateHttpsProbe,
  readPaymateCaCert,
} from "@/lib/paymate/tls";

export const dynamic = "force-dynamic";

/**
 * Verifies the PayMate .crt is present and can complete TLS to paymate.in.
 * Optional: set PAYMATE_TLS_CHECK_SECRET and pass ?secret=... in production.
 */
export async function GET(request: Request) {
  const checkSecret = process.env.PAYMATE_TLS_CHECK_SECRET?.trim();
  if (checkSecret) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") !== checkSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const certPath = getPaymateCertPath();
    const pem = readPaymateCaCert();
    const probeUrl =
      process.env.PAYMATE_TLS_PROBE_URL?.trim() || "https://www.paymate.in/";

    const probe = await paymateHttpsProbe(probeUrl, "HEAD");

    return NextResponse.json({
      ok: true,
      certPath,
      certBytes: Buffer.byteLength(pem, "utf8"),
      probeUrl,
      probeStatus: probe.statusCode,
      message: "PayMate certificate loaded; TLS probe succeeded.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TLS check failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
