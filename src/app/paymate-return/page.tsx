import { Suspense } from "react";
import PaymateReturnPage from "./PaymateReturnClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-16">Loading...</div>}>
      <PaymateReturnPage />
    </Suspense>
  );
}
