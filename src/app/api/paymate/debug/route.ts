import { NextRequest, NextResponse } from "next/server";
import { runPaymateDebug, runPaymateStatusDebug } from "@/lib/paymate/debug-handler";

export async function GET(req: NextRequest) {
  const debugKey = req.nextUrl.searchParams.get("key");
  const orderId = req.nextUrl.searchParams.get("orderId");
  // Convenience: /api/paymate/debug?orderId=... → status debug
  if (orderId) {
    const result = await runPaymateStatusDebug(orderId, debugKey);
    return NextResponse.json(result.body, { status: result.status });
  }
  const result = await runPaymateDebug(debugKey);
  return NextResponse.json(result.body, { status: result.status });
}
