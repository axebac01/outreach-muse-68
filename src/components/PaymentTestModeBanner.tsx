import { isPaymentsConfigured, paymentsEnvironment } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!isPaymentsConfigured()) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
        Produktion-checkout är inte konfigurerad än. Slutför Stripe go-live för att kunna ta emot riktiga betalningar.
      </div>
    );
  }
  try {
    if (paymentsEnvironment() === "sandbox") {
      return (
        <div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900">
          Alla betalningar i förhandsvisningen är i testläge. Använd kortnummer 4242 4242 4242 4242.
        </div>
      );
    }
  } catch {
    return null;
  }
  return null;
}
