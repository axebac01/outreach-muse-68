import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For founders testing the waters",
    features: ["1 campaign", "10 leads per campaign", "AI email generation", "Full email sequences", "Copy to clipboard"],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Growth",
    price: "€99",
    period: "/month",
    description: "For teams scaling outbound",
    features: ["Unlimited campaigns", "Unlimited leads", "AI email generation", "Follow-up sequences", "Priority support", "Team collaboration"],
    cta: "Upgrade to Growth",
    popular: true,
  },
];

const Pricing = () => (
  <Layout>
    <div className="container py-20">
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Simple, transparent pricing</h1>
        <p className="text-muted-foreground">Start free. Upgrade when you're ready to scale.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-xl border p-6 space-y-5 ${tier.popular ? "border-primary shadow-lg shadow-primary/10 relative" : ""}`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                Most popular
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{tier.name}</h3>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </div>
            <div>
              <span className="text-4xl font-bold">{tier.price}</span>
              {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
            </div>
            <ul className="space-y-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant={tier.popular ? "default" : "outline"} asChild>
              <Link to="/signup">{tier.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-8">
        You've reached your free limit? <Link to="/signup" className="text-primary hover:underline font-medium">Upgrade to keep generating outreach.</Link>
      </p>
    </div>
  </Layout>
);

export default Pricing;
