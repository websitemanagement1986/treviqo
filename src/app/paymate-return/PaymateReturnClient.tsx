"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useSite } from "@/context/SiteContext";
import { formatCurrency } from "@/lib/format";
import type { ValidatedLineItem } from "@/lib/validate-cart";

const PENDING_KEY = "treviqo_paymate_pending";

interface StatusResponse {
  success: boolean;
  status: string;
  transaction_id?: string;
  amount?: number;
  customer?: { name: string; email: string };
  items?: ValidatedLineItem[];
  message?: string;
}

export default function PaymateReturnClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { clearCart } = useCart();
  const { site } = useSite();
  const [state, setState] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [message, setMessage] = useState("Checking your payment status...");
  const [order, setOrder] = useState<StatusResponse | null>(null);

  const checkStatus = async () => {
    if (!orderId) {
      setState("failed");
      setMessage("Missing order reference in return URL.");
      return;
    }

    setState("loading");
    setMessage("Checking your payment status...");

    try {
      const res = await fetch(`/api/paymate/status?orderId=${encodeURIComponent(orderId)}`);
      const data = (await res.json()) as StatusResponse;

      if (res.ok && data.success && data.status === "paid") {
        const pendingRaw = sessionStorage.getItem(PENDING_KEY);
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

        clearCart();
        sessionStorage.removeItem(PENDING_KEY);

        const orderData = {
          orderNumber: pending?.orderNumber || orderId,
          transactionId: data.transaction_id || orderId,
          items: pending?.items || [],
          paymentMethod: "gateway" as const,
          form: pending?.form || {
            email: data.customer?.email || "",
            firstName: data.customer?.name?.split(" ")[0] || "",
            lastName: data.customer?.name?.split(" ").slice(1).join(" ") || "",
          },
          date: new Date().toISOString(),
        };
        sessionStorage.setItem("lastOrder", JSON.stringify(orderData));

        setOrder(data);
        setState("success");
        return;
      }

      if (data.status === "failed") {
        setState("failed");
        setMessage(data.message || "Your payment could not be completed.");
        return;
      }

      setState("pending");
      setMessage(data.message || "Your payment is still being processed.");
    } catch (err) {
      setState("failed");
      setMessage(err instanceof Error ? err.message : "Unable to verify payment status.");
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      {state === "loading" && (
        <>
          <h1 className="text-2xl font-bold mb-4">Processing Payment</h1>
          <p className="text-[var(--color-text-muted)]">{message}</p>
        </>
      )}

      {state === "success" && order && (
        <>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-green-600">
            ✓
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-[var(--color-text-muted)] mb-2">
            Order ID: <strong>{order.transaction_id}</strong>
          </p>
          <p className="mb-6">
            Thank you! A confirmation email has been sent to{" "}
            <strong>{order.customer?.email}</strong>.
          </p>
          {order.items && order.items.length > 0 && (
            <div className="bg-[var(--color-surface)] rounded-[var(--border-radius)] p-6 text-left mb-8">
              <h2 className="font-bold mb-4">Order Details</h2>
              {order.items.map((item) => (
                <p key={`${item.id}-${item.size}`} className="text-sm py-1">
                  {item.name} × {item.qty} — {formatCurrency(item.lineTotal)}
                </p>
              ))}
              <p className="font-bold mt-4 pt-4 border-t">
                Total: {formatCurrency(order.amount || 0)}
              </p>
              <p className="text-sm mt-2">
                <strong>Payment:</strong> Paid Online via PayMate
              </p>
            </div>
          )}
          <Link href="/order-confirmation" className="btn-primary">
            View Order Confirmation
          </Link>
        </>
      )}

      {state === "pending" && (
        <>
          <h1 className="text-2xl font-bold mb-4">Payment Pending</h1>
          <p className="text-[var(--color-text-muted)] mb-6">{message}</p>
          <button type="button" onClick={checkStatus} className="btn-primary mr-3">
            Check Again
          </button>
          <Link href="/checkout" className="btn-secondary inline-block">
            Back to Checkout
          </Link>
        </>
      )}

      {state === "failed" && (
        <>
          <h1 className="text-2xl font-bold mb-4">Payment Failed</h1>
          <p className="text-[var(--color-text-muted)] mb-6">{message}</p>
          <Link href="/checkout" className="btn-primary">
            Try Again
          </Link>
        </>
      )}

      <p className="text-xs text-[var(--color-text-muted)] mt-8">
        {site.legalName} | {site.contact.phone}
      </p>
    </div>
  );
}
