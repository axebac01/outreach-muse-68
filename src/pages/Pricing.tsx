import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, X, Shield } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For founders testing the waters",
    features: ["1 campaign", "10 leads per campaign", "10 outreach generations/month", "AI email generation", "Full email sequences", "Copy to clipboard"],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Growth",
    price: "€99",
    period: "/month",
    description: "For teams scaling outbound",
    features: ["Unlimited campaigns", "Unlimited leads", "Unlimited generations", "AI email generation", "Follow-up sequences", "Priority support", "Team collaboration"],
    cta: "Upgrade to Growth",
    popular: true,
  },
];

const comparisonRows = [
  { feature: "Campaigns", starter: "1", growth: "Unlimited" },
  { feature: "Leads per campaign", starter: "10", growth: "Unlimited" },
  { feature: "AI generations / month", starter: "10", growth: "Unlimited" },
  { feature: "Email sequences", starter: true, growth: true },
  { feature: "Regeneration", starter: true, growth: true },
  { feature: "Priority support", starter: false, growth: true },
  { feature: "Team collaboration", starter: false, growth: true },
];

const Pricing = () => (
  <Layout>
    <div className="container py-24">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground">Start free. Upgrade when you're ready to scale.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto mb-20">
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
                Most popular
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
            </div>
            <div>
              <span className="text-5xl font-bold">{tier.price}</span>
              {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
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

      {/* Guarantee */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-16">
        <Shield className="h-4 w-4" />
        <span>30-day money-back guarantee · No questions asked</span>
      </div>

      {/* Comparison Table */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Compare plans</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Feature</th>
                <th className="text-center p-4 font-medium">Starter</th>
                <th className="text-center p-4 font-medium text-primary">Growth</th>
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

      <p className="text-center text-sm text-muted-foreground mt-10">
        You've reached your free limit? <Link to="/signup" className="text-primary hover:underline font-medium">Upgrade to keep generating outreach.</Link>
      </p>
    </div>
  </Layout>
);

export default Pricing;
