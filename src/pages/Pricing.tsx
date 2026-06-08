import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Check, Shield, ChevronDown, Coins, Sparkles, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { isPaymentsConfigured } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { SubscriptionCheckoutDialog } from "@/components/SubscriptionSection";
import { toast } from "sonner";

type PlanKey = "free" | "starter" | "growth" | "scale" | "enterprise";

const PLAN_ORDER: PlanKey[] = ["free", "starter", "growth", "scale", "enterprise"];
const SALES_EMAIL = "hello@maillead.ai";

const PRICE_ID_MAP: Record<Exclude<PlanKey, "free" | "enterprise">, { monthly: string; yearly: string }> = {
  starter: { monthly: "starter_monthly", yearly: "starter_yearly" },
  growth:  { monthly: "growth_monthly",  yearly: "growth_yearly" },
  scale:   { monthly: "scale_monthly",   yearly: "scale_yearly" },
};

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);

  const getPrice = (plan: PlanKey) => {
    if (plan === "free") return t("pricing.plans.free.price");
    if (plan === "enterprise") return t("pricing.plans.enterprise.price");
    return billing === "monthly"
      ? t(`pricing.plans.${plan}.priceMonthly`)
      : t(`pricing.plans.${plan}.priceYearly`);
  };

  const faqs = t("pricing.faqs", { returnObjects: true }) as { q: string; a: string }[];
  const creditRows = t("pricing.creditUsage.rows", { returnObjects: true }) as { action: string; cost: string }[];
  const topupPacks = t("pricing.topups.packs", { returnObjects: true }) as { credits: string; price: string; perCredit: string; badge?: string }[];

  const planCta = (plan: PlanKey) => {
    if (plan === "free") {
      return (
        <Button className="w-full" variant="outline" size="lg" asChild>
          <Link to="/signup">{t("pricing.startFree")}</Link>
        </Button>
      );
    }
    if (plan === "enterprise") {
      return (
        <Button className="w-full" variant="outline" size="lg" asChild>
          <a href={`mailto:${SALES_EMAIL}?subject=Enterprise%20%E2%80%94%20MailLead.ai`}>
            <Mail className="h-4 w-4 mr-2" /> {t("pricing.contactCta")}
          </a>
        </Button>
      );
    }
    const planName = t(`pricing.plans.${plan}.name`);
    const priceId = PRICE_ID_MAP[plan as "starter" | "growth" | "scale"][billing];
    const currentPriceId = subscription?.price_id;
    const isCurrent = isActive && currentPriceId === priceId;

    if (isCurrent) {
      return (
        <Button className="w-full" variant="outline" size="lg" disabled>
          Nuvarande plan
        </Button>
      );
    }

    const handleClick = () => {
      if (!user) {
        navigate(`/signup?next=${encodeURIComponent("/pricing")}`);
        return;
      }
      if (!isPaymentsConfigured()) {
        toast.error("Betalningar är inte konfigurerade än. Försök igen om en stund.");
        return;
      }
      setCheckoutPriceId(priceId);
    };

    return (
      <Button
        className="w-full"
        variant={plan === "growth" ? "hero" : "outline"}
        size="lg"
        onClick={handleClick}
      >
        {t("pricing.choosePlan", { plan: planName })}
      </Button>
    );
  };

  return (
    <Layout>
      <PaymentTestModeBanner />
      <SubscriptionCheckoutDialog
        open={!!checkoutPriceId}
        onOpenChange={(o) => !o && setCheckoutPriceId(null)}
        priceId={checkoutPriceId}
        returnUrl={`${window.location.origin}/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`}
      />
      <SeoHead
        title="Priser — MailLead.ai"
        description="Börja gratis med 25 credits. Toppa upp eller välj månadsplan från 290 kr/mån — du betalar bara för leads du faktiskt vill nå."
        path="/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <div className="container py-20">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{t("pricing.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="inline-flex rounded-full border bg-muted/30 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 text-sm rounded-full transition ${
                billing === "monthly" ? "bg-background shadow font-medium" : "text-muted-foreground"
              }`}
            >
              {t("pricing.billingMonthly")}
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-2 text-sm rounded-full transition flex items-center gap-2 ${
                billing === "yearly" ? "bg-background shadow font-medium" : "text-muted-foreground"
              }`}
            >
              {t("pricing.billingYearly")}
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {t("pricing.yearlyBadge")}
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards: 4 main + Enterprise full-width below */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto mb-5">
          {(["free", "starter", "growth", "scale"] as PlanKey[]).map((plan) => {
            const isPopular = plan === "growth";
            const features = t(`pricing.features.${plan}`, { returnObjects: true }) as string[];
            return (
              <div
                key={plan}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  isPopular
                    ? "border-primary shadow-xl shadow-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                    : "bg-card"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                    {t("pricing.popular")}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-lg">{t(`pricing.plans.${plan}.name`)}</h2>
                  <p className="text-sm text-muted-foreground mt-1 min-h-[2.5rem]">
                    {t(`pricing.plans.${plan}.desc`)}
                  </p>
                </div>
                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{getPrice(plan)}</span>
                    {plan !== "free" && (
                      <span className="text-sm text-muted-foreground">{t("pricing.perMonth")}</span>
                    )}
                  </div>
                  {plan !== "free" && billing === "yearly" && (
                    <p className="text-xs text-muted-foreground mt-1">{t("pricing.billedYearly")}</p>
                  )}
                </div>
                <div className="mt-5 rounded-lg bg-muted/40 px-3 py-2.5">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-primary" />
                    {t(`pricing.plans.${plan}.credits`)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t(`pricing.plans.${plan}.leadsHint`)}
                  </div>
                </div>
                <ul className="space-y-2.5 mt-5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">{planCta(plan)}</div>
                {plan !== "free" && plan !== "enterprise" && (
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    {t("pricing.earlyAccess")}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Enterprise row */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="rounded-2xl border bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-lg">{t("pricing.plans.enterprise.name")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t("pricing.plans.enterprise.desc")}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted-foreground">
                {(t("pricing.features.enterprise", { returnObjects: true }) as string[]).map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary" /> {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="md:text-right">
              <div className="text-sm text-muted-foreground mb-1">{t("pricing.plans.enterprise.leadsHint")}</div>
              <Button asChild size="lg">
                <a href={`mailto:${SALES_EMAIL}?subject=Enterprise%20%E2%80%94%20MailLead.ai`}>
                  <Mail className="h-4 w-4 mr-2" /> {t("pricing.contactCta")}
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-16">
          <Shield className="h-4 w-4" />
          <span>{t("pricing.guarantee")}</span>
        </div>

        {/* What a credit costs */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">{t("pricing.creditUsage.title")}</h2>
          <p className="text-center text-sm text-muted-foreground mb-6">{t("pricing.creditUsage.subtitle")}</p>
          <div className="rounded-xl border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <tbody>
                {creditRows.map((row, i) => (
                  <tr key={row.action} className={i < creditRows.length - 1 ? "border-b" : ""}>
                    <td className="p-4">{row.action}</td>
                    <td className="p-4 text-right font-medium">{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top-ups */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">{t("pricing.topups.title")}</h2>
          <p className="text-center text-sm text-muted-foreground mb-6">{t("pricing.topups.subtitle")}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topupPacks.map((pack) => (
              <div
                key={pack.credits}
                className={`relative rounded-xl border p-4 bg-card text-center ${
                  pack.badge ? "border-primary/40" : ""
                }`}
              >
                {pack.badge && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {pack.badge}
                  </div>
                )}
                <Coins className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-xl font-bold">{pack.credits}</div>
                <div className="text-sm text-muted-foreground">credits</div>
                <div className="mt-3 font-semibold">{pack.price}</div>
                <div className="text-xs text-muted-foreground">
                  {pack.perCredit} {t("pricing.topups.perCredit")}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Button variant="outline" asChild>
              <Link to="/leads/credits">{t("pricing.topups.viewAll")}</Link>
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-center mb-8">{t("pricing.faqTitle")}</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border bg-card">
                <button
                  className="flex items-center justify-between w-full p-4 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("pricing.earlyAccessNote")} ·{" "}
          <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">
            {SALES_EMAIL}
          </a>
        </p>
      </div>
    </Layout>
  );
};

export default Pricing;
