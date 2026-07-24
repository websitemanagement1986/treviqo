import { NextRequest, NextResponse } from "next/server";
import { callPayMate, isSuccessPayload } from "@/lib/paymate/client";
import { getPendingOrder } from "@/lib/paymate/orders";
import { finalizePaidOrder } from "@/lib/paymate/finalize";

export async function GET(req: NextRequest) {
  return handleStatus(req);
}

export async function POST(req: NextRequest) {
  return handleStatus(req);
}

async function handleStatus(req: NextRequest) {
  try {
    const orderId =
      req.nextUrl.searchParams.get("orderId") ||
      ((await req.json().catch(() => ({}))) as { orderId?: string }).orderId;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const pending = getPendingOrder(orderId);
    if (!pending) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (pending.status === "paid") {
      return NextResponse.json({
        success: true,
        status: "paid",
        transaction_id: pending.transactionId || orderId,
        amount: pending.total,
        customer: pending.customer,
        items: pending.items,
      });
    }

    const inquiryPayload = {
      OrderId: orderId,
      TransactionRefNo: pending.transactionId || "",
      FromDate: "",
      ToDate: "",
    };

    let paymateStatus: Record<string, unknown> | null = null;
    try {
      const { decrypted } = await callPayMate(inquiryPayload);
      paymateStatus = decrypted;
      if (isSuccessPayload(decrypted)) {
        const summary = decrypted.DetailedSummary as Record<string, unknown> | undefined;
        const response = decrypted.Response as Record<string, unknown> | undefined;
        const paymentStatus = String(
          summary?.Status || response?.Status || decrypted.Status || ""
        ).toLowerCase();

        if (
          paymentStatus.includes("paid") ||
          paymentStatus.includes("success") ||
          paymentStatus.includes("completed")
        ) {
          const result = await finalizePaidOrder(orderId, decrypted);
          if (result.ok) {
            const updated = getPendingOrder(orderId);
            return NextResponse.json({
              success: true,
              status: "paid",
              transaction_id: result.transactionId,
              amount: updated?.total,
              customer: updated?.customer,
              items: updated?.items,
            });
          }
        }
      }
    } catch {
      // Inquiry shape may differ on production; fall back to local pending state.
    }

    return NextResponse.json({
      success: false,
      status: pending.status,
      order_id: orderId,
      amount: pending.total,
      paymate_status: paymateStatus,
      message:
        pending.status === "failed"
          ? pending.failureReason || "Payment failed"
          : "Payment is still pending. If you completed payment, please wait a moment and refresh.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 400 }
    );
  }
}
