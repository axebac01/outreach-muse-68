import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { PlanKey } from "@/hooks/usePlanLimits";

interface Props {
  resource: "email_accounts" | "campaigns" | "inbox_ai";
  currentPlan: PlanKey;
  suggestedPlan?: "starter" | "growth" | "scale";
  className?: string;
}

const PLAN_PRICE: Record<string, string> = {
  starter: "290 kr/mån",
  growth: "990 kr/mån",
  scale: "2 490 kr/mån",
};

const RESOURCE_LABEL: Record<Props["resource"], string> = {
  email_accounts: "mejlkonton",
  campaigns: "kampanjer",
  inbox_ai: "AI-svar i inbox",
};

const SUGGESTED_BY_RESOURCE: Record<Props["resource"], "starter" | "growth"> = {
  email_accounts: "starter",
  campaigns: "starter",
  inbox_ai: "growth",
};

export function PlanLimitBanner({ resource, currentPlan, suggestedPlan, className = "" }: Props) {
  const target = suggestedPlan ?? SUGGESTED_BY_RESOURCE[resource];
  const targetName = target.charAt(0).toUpperCase() + target.slice(1);
  const price = PLAN_PRICE[target];

  return (
    <div
      className={`rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 flex items-start gap-3 ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {currentPlan === "free" ? "Free-planen" : `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}-planen`}{" "}
          inkluderar inte fler {RESOURCE_LABEL[resource]}.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Uppgradera till {targetName} för {price} och fortsätt växa.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/pricing">Uppgradera</Link>
      </Button>
    </div>
  );
}
