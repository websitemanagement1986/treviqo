"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { IconCheck } from "@/components/icons";
import type { CartItem } from "@/lib/types";

interface OrderData {
  orderNumber: string;
  items: CartItem[];
  paymentMethod?: "cod" | "gateway";
  form: {
    email: string;
    firstName: string;
    lastName: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  date: string;
}

export default function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("lastOrder");
    if (raw) {
      const data = JSON.parse(raw) as OrderData;
      if (!orderParam || data.orderNumber === orderParam) {
        setOrder(data);
      }
    }
  }, [orderParam]);

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg text-[var(--color-text-muted)] mb-6">Order not found.</p>
        <Link href="/" className="btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <IconCheck className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Thank You for Your Order!</h1>
      <p className="text-[var(--color-text-muted)] mb-2">
        Confirmation sent to {order.form.email}
      </p>
      <p className="font-semibold mb-8">Order #{order.orderNumber}</p>

      <div className="bg-[var(--color-surface)] rounded-[var(--border-radius)] p-6 text-left mb-8">
        <h2 className="font-bold mb-4">Order Summary</h2>
        {order.items.map((item) => (
          <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm py-2 border-b border-gray-200 last:border-0">
            <span>
              {item.name} x{item.quantity}
              <span className="text-[var(--color-text-muted)]"> ({item.size}, {item.color})</span>
            </span>
            <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-4 pt-4 border-t border-gray-300">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
          <span className="text-[var(--color-text-muted)]">Payment: </span>
          <span className="font-semibold">
            {order.paymentMethod === "cod" || !order.paymentMethod
              ? "Cash on Delivery (COD)"
              : "Payment Gateway"}
          </span>
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-2">
        Shipping to: {order.form.firstName} {order.form.lastName}
        {order.form.address && (
          <>, {order.form.address}, {order.form.city}, {order.form.state} - {order.form.zip}</>
        )}
      </p>
      {order.paymentMethod === "cod" || !order.paymentMethod ? (
        <p className="text-sm text-green-700 mb-6">
          Please keep cash ready for payment upon delivery.
        </p>
      ) : null}

      <Link href="/" className="btn-primary">Continue Shopping</Link>
    </div>
  );
}
