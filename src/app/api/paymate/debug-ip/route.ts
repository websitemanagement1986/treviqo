import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ipResponse = await fetch("https://api.ipify.org?format=json");
    const ipData = (await ipResponse.json()) as { ip: string };

    return NextResponse.json({
      outbound_ip: ipData.ip,
      note: "Give this IP to PayMate for API whitelist (outbound IP from your server).",
      business_xpress_id: process.env.PAYMATE_BUSINESS_XPRESS_ID || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to detect IP" },
      { status: 500 }
    );
  }
}
