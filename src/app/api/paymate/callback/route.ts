import { NextRequest, NextResponse } from "next/server";
import { markOrderFailed } from "@/lib/paymate/orders";
import {
  decryptCallbackBody,
  extractOrderId,
  finalizePaidOrder,
  isCallbackSuccess,
} from "@/lib/paymate/finalize";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload = decryptCallbackBody(body);
    const orderId = extractOrderId(payload);

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing in PayMate callback" }, { status: 400 });
    }

    if (!isCallbackSuccess(payload)) {
      markOrderFailed(
        orderId,
        String(payload?.Description || payload?.ErrorDescription || "Payment failed")
      );
      return NextResponse.json({ error: "Payment not successful", details: payload }, { status: 400 });
    }

    const result = await finalizePaidOrder(orderId, payload);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transaction_id: result.transactionId,
      already_processed: Boolean("alreadyProcessed" in result && result.alreadyProcessed),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Callback failed" },
      { status: 400 }
    );
  }
}
