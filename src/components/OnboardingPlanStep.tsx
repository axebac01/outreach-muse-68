import { useState } from "react";
import { Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPaymentsConfigured } from "@/lib/stripe";
import { SubscriptionCheckoutDialog } from "@/components/SubscriptionSection";
import { useSubscription } from "@/hooks/useSubscription";

export type PlanChoice = "free" | "starter" | "growth" | "scale";

type PaidPlanKey = "starter" | "growth" | "scale";

const PAID_PRICE_IDS: Record<PaidPlanKey, { monthly: string; yearly: string }> = {
  starter: { monthly: "starter_monthly", yearly: "starter_yearly" },
  growth:  { monthly: "growth_monthly",  yearly: "growth_yearly" },
  scale:   { monthly: "scale_monthly",   yearly: "scale_yearly" },
};

export const PRICE_TO_PLAN: Record<string, PlanChoice> = {
  starter_monthly: "starter", starter_yearly: "starter",
  growth_monthly:  "growth",  growth_yearly:  "growth",
  scale_monthly:   "scale",   scale_yearly:   "scale",
};

const PLANS: Array<{
  key: PlanChoice;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  credits: string;
  features: string[];
  popular?: boolean;
  free?: boolean;
}> = [
  {
    key: "free",
    name: "Free",
    priceMonthly: "0 kr",
    priceYearly: "0 kr",
    credits: "25 credits (engång)",
    features: ["1 mejlkonto", "1 kampanj", "Prova allt utan kort"],
    free: true,
  },
  {
    key: "starter",
    name: "Starter",
    priceMonthly: "290 kr/mån",
    priceYearly: "230 kr/mån",
    credits: "250 credits/månad",
    features: ["3 mejlkonton", "Obegränsade kampanjer", "Smart inbox"],
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthly: "990 kr/mån",
    priceYearly: "790 kr/mån",
    credits: "1 000 credits/månad",
    features: ["10 mejlkonton", "AI-svar i inbox", "Prioriterad support"],
    popular: true,
  },
  {
    key: "scale",
    name: "Scale",
    priceMonthly: "2 490 kr/mån",
    priceYearly: "1 990 kr/mån",
    credits: "3 000 credits/månad",
    features: ["Obegränsade konton", "Inbound-leads (kommer snart)", "Dedikerad onboarding"],
  },
];

interface Props {
  onSelect: (choice: PlanChoice) => void;
  submitting: boolean;
}

export function OnboardingPlanStep({ onSelect, submitting }: Props) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [pendingPaidChoice, setPendingPaidChoice] = useState<PaidPlanKey | null>(null);
  const { isActive, subscription, refetch } = useSubscription();
  const paymentsReady = isPaymentsConfigured();

  // Om användaren redan har aktiv plan (t.ex. återupptog onboarding efter checkout)
  if (isActive && subscription) {
    const activeChoice: PlanChoice =
      (subscription.price_id && PRICE_TO_PLAN[subscription.price_id]) || "free";
    return (
      <div className="text-center space-y-6">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Du har redan ett abonnemang
        </h1>
        <p className="text-muted-foreground">Vi tar dig vidare till sista steget.</p>
        <Button size="lg" onClick={() => onSelect(activeChoice)} disabled={submitting}>
          Fortsätt
        </Button>
      </div>
    );
  }

  const handlePaidClick = (plan: PaidPlanKey) => {
    if (!paymentsReady) return;
    setPendingPaidChoice(plan);
    setCheckoutPriceId(PAID_PRICE_IDS[plan][billing]);
  };

  const handleDialogChange = async (open: boolean) => {
    if (!open) {
      // Tvinga in färsk subscription-status (webhook hinner ibland före, ibland inte)
      const result = await refetch();
      const fresh = result.data;
      const freshActive = !!fresh && ["active", "trialing", "past_due"].includes(fresh.status);
      if (freshActive && pendingPaidChoice) {
        onSelect(pendingPaidChoice);
      }
      setCheckoutPriceId(null);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-3 text-center">
        Välj plan
      </h1>
      <p className="text-muted-foreground text-center mb-8">
        Du kan byta eller säga upp när som helst.
      </p>

      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="inline-flex rounded-full border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 text-sm rounded-full transition ${
              billing === "monthly" ? "bg-background shadow font-medium" : "text-muted-foreground"
            }`}
          >
            Månad
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`px-4 py-1.5 text-sm rounded-full transition flex items-center gap-2 ${
              billing === "yearly" ? "bg-background shadow font-medium" : "text-muted-foreground"
            }`}
          >
            År
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              −20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
          const disabled = !plan.free && !paymentsReady;
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-5 flex flex-col text-left ${
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                  : "bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                  Populär
                </div>
              )}
              <div className="font-semibold text-lg">{plan.name}</div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{price}</div>
              <div className="mt-3 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-primary" />
                {plan.credits}
              </div>
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {plan.free ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onSelect("free")}
                    disabled={submitting}
                  >
                    Fortsätt gratis
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handlePaidClick(plan.key as PaidPlanKey)}
                    disabled={disabled || submitting}
                    title={disabled ? "Tillgängligt snart" : undefined}
                  >
                    {disabled ? "Tillgängligt snart" : `Välj ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => onSelect("free")}
          disabled={submitting}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Hoppa över — jag bestämmer mig senare
        </button>
      </div>

      <SubscriptionCheckoutDialog
        open={!!checkoutPriceId}
        onOpenChange={handleDialogChange}
        priceId={checkoutPriceId}
        returnUrl={`${window.location.origin}/onboarding?subscription=success`}
      />
    </div>
  );
}
