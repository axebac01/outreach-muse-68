import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Zap, Target, BarChart3, Users, Clock } from "lucide-react";

const features = [
  { icon: Zap, title: "Personalized in seconds", description: "Generate unique emails for every lead based on their company, role, and background — no templates needed." },
  { icon: Target, title: "3x more replies", description: "Outreach that's actually relevant gets opened, read, and replied to." },
  { icon: Clock, title: "Hours saved, every day", description: "Stop researching and writing manually. MailLead.ai does the heavy lifting so you can focus on closing." },
  { icon: Users, title: "Built for teams", description: "Manage campaigns, leads, and sequences in one place — whether you're a founder or a 50-person sales team." },
  { icon: BarChart3, title: "Campaign overview", description: "See all your campaigns and generated outreach from a single dashboard." },
  { icon: Mail, title: "Full email sequences", description: "Get a cold email plus two follow-ups generated for every single lead." },
];

const Landing = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            Personalized outbound that actually gets replies.
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1]">
            Write personalized cold emails{" "}
            <span className="text-primary">at scale.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            MailLead.ai helps founders and sales teams generate high-converting outreach for every lead — without spending hours researching and writing manually.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
          <p className="text-xs text-muted-foreground">No credit card required · Set up in 2 minutes</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything you need to book more meetings</h2>
            <p className="text-muted-foreground">From lead import to personalized sequences — one workflow, zero busywork.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to send outreach that converts?</h2>
          <p className="text-muted-foreground">Join hundreds of teams already using MailLead.ai to book more meetings.</p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup" className="gap-2">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            SignalFlow
          </div>
          <p className="text-xs text-muted-foreground">© 2026 SignalFlow. All rights reserved.</p>
        </div>
      </footer>
    </Layout>
  );
};

export default Landing;
