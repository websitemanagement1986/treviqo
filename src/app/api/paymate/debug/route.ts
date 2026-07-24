import { NextRequest, NextResponse } from "next/server";
import { runPaymateDebug } from "@/lib/paymate/debug-handler";

export async function GET(req: NextRequest) {
  const debugKey = req.nextUrl.searchParams.get("key");
  const result = await runPaymateDebug(debugKey);
  return NextResponse.json(result.body, { status: result.status });
}
