const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
        Produktionsbetalningar är inte konfigurerade. Slutför Stripe go-live i Lovable för att ta emot riktiga betalningar.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-warning/10 border-b border-warning/30 px-4 py-2 text-center text-sm text-warning-foreground/80 dark:text-warning">
        Alla betalningar i förhandsvisningen är i testläge — inga riktiga pengar dras.
      </div>
    );
  }
  return null;
}
