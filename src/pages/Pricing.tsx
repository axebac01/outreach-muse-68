import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, X, Shield, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const Pricing = () => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tiers = [
    {
      name: t("pricing.starterName"),
      price: t("pricing.starterPrice"),
      period: "",
      description: t("pricing.starterDesc"),
      features: t("pricing.starterFeatures", { returnObjects: true }) as string[],
      cta: t("pricing.starterCta"),
      popular: false,
    },
    {
      name: t("pricing.growthName"),
      price: t("pricing.growthPrice"),
      period: t("pricing.growthPeriod"),
      description: t("pricing.growthDesc"),
      features: t("pricing.growthFeatures", { returnObjects: true }) as string[],
      cta: t("pricing.growthCta"),
      popular: true,
    },
  ];

  const unlimited = t("pricing.rows.unlimited");
  const comparisonRows = [
    { feature: t("pricing.rows.campaigns"), starter: "1", growth: unlimited },
    { feature: t("pricing.rows.leadsPer"), starter: "10", growth: unlimited },
    { feature: t("pricing.rows.generations"), starter: "10", growth: unlimited },
    { feature: t("pricing.rows.sequences"), starter: true, growth: true },
    { feature: t("pricing.rows.regen"), starter: true, growth: true },
    { feature: t("pricing.rows.support"), starter: false, growth: true },
    { feature: t("pricing.rows.team"), starter: false, growth: true },
  ];

  const faqs = t("pricing.faqs", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <Layout>
      <SeoHead
        title="Priser — MailLead.ai"
        description="Starter (gratis) eller Growth — välj plan för att skicka personliga kalla mejl i stor skala. Inga dolda kostnader, avsluta när du vill."
        path="/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (t("pricing.faqs", { returnObjects: true }) as { q: string; a: string }[]).map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <div className="container py-24">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t("pricing.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto mb-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-8 space-y-6 ${
                tier.popular
                  ? "border-primary shadow-lg shadow-primary/10 relative bg-gradient-to-b from-primary/5 to-transparent"
                  : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                  {t("pricing.popular")}
                </div>
              )}
              <div>
                <h2 className="font-semibold text-lg">{tier.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
              </div>
              <div>
                <span className="text-5xl font-bold">{tier.price}</span>
                {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                {tier.popular && (
                  <p className="text-xs text-muted-foreground mt-2">{t("pricing.growthNote")}</p>
                )}
              </div>
              <ul className="space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={tier.popular ? "hero" : "outline"} size="lg" asChild>
                <Link to="/signup">{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-16">
          <Shield className="h-4 w-4" />
          <span>{t("pricing.guarantee")}</span>
        </div>

        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">{t("pricing.compareTitle")}</h2>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">{t("pricing.feature")}</th>
                  <th className="text-center p-4 font-medium">{t("pricing.starterName")}</th>
                  <th className="text-center p-4 font-medium text-primary">{t("pricing.growthName")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b last:border-0">
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td className="p-4 text-center">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">{row.starter}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.growth === "boolean" ? (
                        row.growth ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="font-medium">{row.growth}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("pricing.faqTitle")}</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border">
                <button
                  className="flex items-center justify-between w-full p-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
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

        <p className="text-center text-sm text-muted-foreground">
          {t("pricing.footerCtaPrefix")} <Link to="/signup" className="text-primary hover:underline font-medium">{t("pricing.footerCtaLink")}</Link>
        </p>
      </div>
    </Layout>
  );
};

export default Pricing;
