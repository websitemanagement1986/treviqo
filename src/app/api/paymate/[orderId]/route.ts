import { NextRequest, NextResponse } from "next/server";
import { authorizePartnerRequest } from "@/lib/paymate/partner-auth";
import {
  getPartnerOrderStatus,
  isReservedPartnerOrderId,
} from "@/lib/paymate/partner-status";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * External partner API: payment status by orderId.
 *
 * GET /api/paymate/{orderId}
 * Headers: X-API-Key or Authorization: Bearer
 * Response: { status, message, orderId, rrn, amount }
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = authorizePartnerRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: auth.error,
        orderId: null,
        rrn: null,
        amount: null,
      },
      { status: auth.status }
    );
  }

  const { orderId: rawOrderId } = await context.params;
  const orderId = String(rawOrderId || "").trim();

  if (!orderId) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: "orderId is required",
        orderId: null,
        rrn: null,
        amount: null,
      },
      { status: 400 }
    );
  }

  if (isReservedPartnerOrderId(orderId)) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: "Invalid orderId",
        orderId,
        rrn: null,
        amount: null,
      },
      { status: 400 }
    );
  }

  const result = await getPartnerOrderStatus(orderId);
  return NextResponse.json(result.body, { status: result.httpStatus });
}
