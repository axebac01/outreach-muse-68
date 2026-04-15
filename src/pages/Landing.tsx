import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Zap, Target, BarChart3, Users, Clock, Star } from "lucide-react";

const features = [
  { icon: Zap, title: "Personalized in seconds", description: "Generate unique emails for every lead based on their company, role, and background — no templates needed." },
  { icon: Target, title: "3x more replies", description: "Outreach that's actually relevant gets opened, read, and replied to." },
  { icon: Clock, title: "Hours saved, every day", description: "Stop researching and writing manually. MailLead.ai does the heavy lifting so you can focus on closing." },
  { icon: Users, title: "Built for teams", description: "Manage campaigns, leads, and sequences in one place — whether you're a founder or a 50-person sales team." },
  { icon: BarChart3, title: "Campaign overview", description: "See all your campaigns and generated outreach from a single dashboard." },
  { icon: Mail, title: "Full email sequences", description: "Get a cold email plus two follow-ups generated for every single lead." },
];

const socialProof = [
  { metric: "500+", label: "Sales teams" },
  { metric: "50K+", label: "Emails generated" },
  { metric: "3.2x", label: "More replies" },
];

const Landing = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        {/* Animated gradient blob */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="container relative py-24 md:py-40">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground animate-fade-in">
              <Zap className="h-3.5 w-3.5" />
              Personalized outbound that actually gets replies.
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl leading-[1.05] animate-fade-in">
              Write personalized cold emails{" "}
              <span className="text-primary">at scale.</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in">
              MailLead.ai helps founders and sales teams generate high-converting outreach for every lead — without spending hours researching and writing manually.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-fade-in">
              <Button variant="hero" size="lg" asChild>
                <Link to="/signup" className="gap-2">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground animate-fade-in">No credit card required · Set up in 2 minutes</p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-muted/30 py-10">
        <div className="container">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-20">
            {socialProof.map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{item.metric}</div>
                <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to book more meetings</h2>
            <p className="text-lg text-muted-foreground">From lead import to personalized sequences — one workflow, zero busywork.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-7 space-y-4 hover:shadow-md hover:border-primary/20 hover:-translate-y-1 transition-all duration-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-primary text-primary" />)}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium leading-relaxed">
              "We used to spend 3 hours writing emails for 10 leads. MailLead.ai does it in under a minute — and the reply rates are actually better."
            </blockquote>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sarah Chen</span> · Head of Sales, GrowthStack
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to send outreach that converts?</h2>
          <p className="text-lg text-muted-foreground">Join hundreds of teams already using MailLead.ai to book more meetings.</p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup" className="gap-2">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-3 sm:hidden z-50">
        <Button className="w-full" size="lg" asChild>
          <Link to="/signup">Start free — no credit card needed</Link>
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            MailLead.ai
          </div>
          <p className="text-xs text-muted-foreground">© 2026 MailLead.ai. All rights reserved.</p>
        </div>
      </footer>
    </Layout>
  );
};

export default Landing;
