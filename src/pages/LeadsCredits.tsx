import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Check, ArrowLeft, Sparkles } from "lucide-react";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { CreditCheckout } from "@/components/CreditCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { isPaymentsConfigured } from "@/lib/stripe";

interface Pack {
  priceId: string;
  credits: number;
  priceSek: number;
  perCredit: number;
  badge?: string;
  description: string;
}

// 1 credit = 1 verifierad mejladress. Plan ger alltid bättre kr/credit än topp-up.
const PACKS: Pack[] = [
  {
    priceId: "credits_200_sek",
    credits: 200,
    priceSek: 390,
    perCredit: 1.95,
    description: "Snabb påfyllning. 200 verifierade leads.",
  },
  {
    priceId: "credits_800_sek",
    credits: 800,
    priceSek: 1390,
    perCredit: 1.74,
    badge: "Populärast",
    description: "800 leads — passar en månadskampanj.",
  },
  {
    priceId: "credits_3500_sek",
    credits: 3500,
    priceSek: 5490,
    perCredit: 1.57,
    description: "3 500 leads — flera kampanjer parallellt.",
  },
  {
    priceId: "credits_10000_sek",
    credits: 10000,
    priceSek: 13990,
    perCredit: 1.40,
    badge: "Bästa pris",
    description: "10 000 leads — bäst kr/credit. För byråer.",
  },
];

export default function LeadsCredits() {
  const { balance } = useCreditBalance();
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  const returnUrl = `${window.location.origin}/leads/credits/return?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <Layout>
      <PaymentTestModeBanner />
      <div className="container py-8 max-w-6xl">
        <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Tillbaka till Leads
        </Link>

        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Köp credits</h1>
            <p className="text-muted-foreground mt-1">
              1 credit = 1 verifierad mejladress. Credits från topp-ups gäller i 12 månader.
            </p>
          </div>
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Coins className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Nuvarande saldo</div>
                <div className="font-bold text-lg leading-none">{balance ?? "—"} credits</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!isPaymentsConfigured() && (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="py-4 text-sm text-destructive">
              Betalningar är inte aktiverade i den här builden.
            </CardContent>
          </Card>
        )}

        {!selectedPriceId ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PACKS.map((pack) => (
              <Card
                key={pack.priceId}
                className={`relative transition-all hover:border-primary/50 ${
                  pack.badge === "Populärast" ? "border-primary/50 shadow-md" : ""
                }`}
              >
                {pack.badge && (
                  <Badge className="absolute -top-2 left-4">{pack.badge}</Badge>
                )}
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-bold">
                      {pack.credits.toLocaleString("sv-SE")} credits
                    </h3>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{pack.priceSek.toLocaleString("sv-SE")}</span>
                    <span className="text-muted-foreground">kr</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pack.perCredit.toFixed(2).replace(".", ",")} kr/credit · exkl. moms
                  </p>
                  <p className="text-sm text-muted-foreground mt-3 min-h-[2.5rem]">
                    {pack.description}
                  </p>
                  <ul className="space-y-1.5 mt-4 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{pack.credits.toLocaleString("sv-SE")} verifierade leads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Verifierade B2B-emails</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Refund vid trasig data</span>
                    </li>
                  </ul>
                  <Button
                    className="w-full mt-5 gap-2"
                    onClick={() => setSelectedPriceId(pack.priceId)}
                    disabled={!isPaymentsConfigured()}
                  >
                    <Sparkles className="h-4 w-4" />
                    Köp nu
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedPriceId(null)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Välj annat paket
            </Button>
            <Card>
              <CardContent className="pt-6">
                <CreditCheckout priceId={selectedPriceId} returnUrl={returnUrl} />
              </CardContent>
            </Card>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Söker du ett månadsabonnemang med inkluderade credits? Se{" "}
          <Link to="/pricing" className="text-primary hover:underline">priser & paket</Link>.
        </p>
      </div>
    </Layout>
  );
}
