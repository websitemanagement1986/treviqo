import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Bag", href: "/cart" },
          { label: "Checkout" },
        ]}
      />
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
