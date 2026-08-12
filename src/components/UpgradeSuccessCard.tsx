import { CheckCircle2, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLAN_INFO: Record<string, { name: string; credits: number; perks: string[] }> = {
  starter_monthly: { name: "Starter", credits: 250, perks: ["Obegränsat antal kampanjer", "3 e-postkonton", "200 utskick/dag och konto"] },
  starter_yearly:  { name: "Starter (årsvis)", credits: 250, perks: ["Obegränsat antal kampanjer", "3 e-postkonton", "200 utskick/dag och konto"] },
  growth_monthly:  { name: "Growth", credits: 1000, perks: ["Obegränsat antal kampanjer", "10 e-postkonton", "500 utskick/dag och konto", "AI-analys i inkorgen"] },
  growth_yearly:   { name: "Growth (årsvis)", credits: 1000, perks: ["Obegränsat antal kampanjer", "10 e-postkonton", "500 utskick/dag och konto", "AI-analys i inkorgen"] },
  scale_monthly:   { name: "Scale", credits: 3000, perks: ["Obegränsat antal kampanjer", "Obegränsat antal e-postkonton", "1 000 utskick/dag och konto", "AI-analys i inkorgen"] },
  scale_yearly:    { name: "Scale (årsvis)", credits: 3000, perks: ["Obegränsat antal kampanjer", "Obegränsat antal e-postkonton", "1 000 utskick/dag och konto", "AI-analys i inkorgen"] },
};

interface Props {
  state: "pending" | "confirmed" | "timeout";
  priceId?: string | null;
  onDismiss: () => void;
}

export function UpgradeSuccessCard({ state, priceId, onDismiss }: Props) {
  if (state === "pending") {
    return (
      <div className="rounded-xl border bg-card p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium">Bekräftar din betalning…</p>
          <p className="text-sm text-muted-foreground">Det tar oftast bara några sekunder.</p>
        </div>
      </div>
    );
  }

  if (state === "timeout") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-6 space-y-2">
        <p className="font-medium">Betalningen tas emot – vi väntar på bekräftelse</p>
        <p className="text-sm">
          Din betalning gick igenom men bekräftelsen har inte kommit fram än. Den brukar dyka upp inom
          någon minut. Ladda om sidan om en stund, eller hör av dig till oss om det kvarstår.
        </p>
        <Button variant="outline" size="sm" onClick={onDismiss}>Stäng</Button>
      </div>
    );
  }

  const info = (priceId && PLAN_INFO[priceId]) || null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <PartyPopper className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">
            Grattis{info ? ` – du kör nu ${info.name}!` : " – uppgraderingen är klar!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {info
              ? `${info.credits} credits läggs till varje månad. Allt nedan är upplåst direkt.`
              : "Din plan är aktiv och alla funktioner är upplåsta."}
          </p>
        </div>
      </div>

      {info && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {info.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="hero" asChild>
          <a href="/campaign/new">
            <Sparkles className="h-4 w-4 mr-2" /> Skapa en kampanj
          </a>
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>Stäng</Button>
      </div>
    </div>
  );
}
