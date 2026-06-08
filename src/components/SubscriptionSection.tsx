import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const PLAN_LABEL: Record<string, { name: string; credits: number }> = {
  starter_monthly: { name: "Starter (månadsvis)", credits: 250 },
  starter_yearly:  { name: "Starter (årsvis)", credits: 250 },
  growth_monthly:  { name: "Growth (månadsvis)", credits: 1000 },
  growth_yearly:   { name: "Growth (årsvis)", credits: 1000 },
  scale_monthly:   { name: "Scale (månadsvis)", credits: 3000 },
  scale_yearly:    { name: "Scale (årsvis)", credits: 3000 },
};

export function SubscriptionSection() {
  const { subscription, isActive, isLoading } = useSubscription();
  const [opening, setOpening] = useState(false);

  const openPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/settings` },
      });
      if (error || !data?.url) throw new Error(error?.message || "Kunde inte öppna portalen");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOpening(false);
    }
  };

  const planMeta = subscription?.price_id ? PLAN_LABEL[subscription.price_id] : null;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("sv-SE")
    : null;

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 card-hover">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Abonnemang</h2>
          <p className="text-sm text-muted-foreground">Hantera din månads- eller årsplan.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Laddar…</div>
      ) : isActive && subscription ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{planMeta?.name ?? subscription.price_id}</span>
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </div>
              {planMeta && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {planMeta.credits} credits/månad
                </p>
              )}
            </div>
            <Button onClick={openPortal} disabled={opening} variant="outline" size="sm">
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Hantera
            </Button>
          </div>
          {subscription.cancel_at_period_end && periodEnd && (
            <div className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2">
              Uppsagd — slutar förnyas {periodEnd}. Du behåller åtkomsten fram tills dess.
            </div>
          )}
          {!subscription.cancel_at_period_end && periodEnd && (
            <p className="text-xs text-muted-foreground">Nästa förnyelse: {periodEnd}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="secondary">Free</Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Du betalar bara för leads du vill nå. Uppgradera för månatliga credits.
            </p>
          </div>
          <Button asChild size="sm" disabled={!isPaymentsConfigured()}>
            <Link to="/pricing">Uppgradera</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceId: string | null;
  returnUrl: string;
}

export function SubscriptionCheckoutDialog({ open, onOpenChange, priceId, returnUrl }: CheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Slutför ditt abonnemang</DialogTitle>
        </DialogHeader>
        {priceId && <StripeEmbeddedCheckout priceId={priceId} returnUrl={returnUrl} />}
      </DialogContent>
    </Dialog>
  );
}
