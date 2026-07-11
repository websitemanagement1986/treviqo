import { Suspense } from "react";
import OrderConfirmationClient from "./OrderConfirmationClient";

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-16">Loading...</div>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
