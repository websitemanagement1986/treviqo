import { NextRequest, NextResponse } from "next/server";
import { runPaymateStatusDebug } from "@/lib/paymate/debug-handler";

/**
 * Payment status debug.
 * - GET /api/paymate/debug-status → list recent local pending orders
 * - GET /api/paymate/debug-status?orderId=TRV... → local store + PayMate inquiry details
 */
export async function GET(req: NextRequest) {
  const debugKey = req.nextUrl.searchParams.get("key");
  const orderId = req.nextUrl.searchParams.get("orderId");
  const result = await runPaymateStatusDebug(orderId, debugKey);
  return NextResponse.json(result.body, { status: result.status });
}
