import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Radar,
  Building2,
  Target,
  Sparkles,
  Bell,
  Flame,
  TrendingUp,
  Eye,
  ArrowUpRight,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const FEATURE_KEY = "inbound";
const emailSchema = z.string().trim().email("Ange en giltig e-postadress").max(255);

const NotifyMeDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("launch_interest").insert({
      email: parsed.data.toLowerCase(),
      feature: FEATURE_KEY,
      user_id: user?.id ?? null,
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.success("Du står redan på listan", {
          description: "Vi hör av oss så snart Inbound släpps.",
        });
        setOpen(false);
        return;
      }
      toast.error("Något gick fel", { description: error.message });
      return;
    }
    toast.success("Tack!", {
      description: "Vi hör av oss så snart Inbound släpps.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Bell className="h-4 w-4" /> Notifiera mig vid lansering
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Få besked när Inbound släpps</DialogTitle>
          <DialogDescription>
            Vi mejlar dig så fort funktionen är redo. Inget spam.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notify-email">E-post</Label>
            <Input
              id="notify-email"
              type="email"
              autoComplete="email"
              placeholder="du@foretag.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Skickar..." : "Notifiera mig"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const visits = [
  { name: "Spotify", initials: "SP", city: "Stockholm", industry: "Music · 4 200 anst.", pages: 6, time: "2 min sedan", hot: true, known: true },
  { name: "Klarna", initials: "KL", city: "Stockholm", industry: "Fintech · 5 000 anst.", pages: 3, time: "14 min sedan", hot: true, known: false },
  { name: "Volvo Cars", initials: "VC", city: "Göteborg", industry: "Automotive · 41 000 anst.", pages: 2, time: "47 min sedan", hot: false, known: true },
  { name: "IKEA Retail", initials: "IK", city: "Malmö", industry: "Retail · 70 000 anst.", pages: 5, time: "1 t sedan", hot: true, known: false },
  { name: "Notion Labs", initials: "NL", city: "San Francisco", industry: "SaaS · 800 anst.", pages: 1, time: "2 t sedan", hot: false, known: false },
];

const topPages = [
  { path: "/pricing", count: 47 },
  { path: "/features", count: 31 },
  { path: "/demo", count: 22 },
  { path: "/about", count: 14 },
  { path: "/blog/seo-guide", count: 9 },
];

const sparkPoints = [12, 18, 14, 22, 19, 28, 24, 31, 27, 36, 33, 42, 38, 47];

const features = [
  {
    icon: Building2,
    title: "Företagsidentifiering",
    desc: "Identifiera B2B-besökare via IP och berika med bransch, storlek och kontaktytor.",
  },
  {
    icon: Target,
    title: "Lead-matchning",
    desc: "Få notiser när dina befintliga leads återbesöker sajten — följ upp i rätt ögonblick.",
  },
  {
    icon: Sparkles,
    title: "Smart prioritering",
    desc: "Se vilka sidor besökaren tittat på och hur het signalen är, så du vet vem du ska kontakta först.",
  },
];

const Sparkline = () => {
  const max = Math.max(...sparkPoints);
  const w = 200;
  const h = 48;
  const step = w / (sparkPoints.length - 1);
  const pts = sparkPoints.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`);
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkfill)" />
      <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const Inbound = () => {
  const maxCount = Math.max(...topPages.map((p) => p.count));

  return (
    <Layout>
      <div className="container max-w-5xl py-12 space-y-16">
        {/* Hero */}
        <section className="text-center space-y-6">
          <div className="flex justify-center">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Beta · Kommer snart
            </Badge>
          </div>

          <div className="relative inline-flex mx-auto">
            <div className="absolute inset-0 -m-10 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="relative rounded-2xl border bg-card p-5 shadow-lg">
              <Radar className="h-10 w-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              Vet vilka företag som besöker din sajt
            </h1>
            <p className="text-lg text-muted-foreground">
              Förvandla anonym webbtrafik till varma leads. Inbound visar dig
              företagen bakom besöken — även om de aldrig fyller i ett formulär.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <NotifyMeDialog />
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("preview")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Se hur det fungerar
            </Button>
          </div>
        </section>

        {/* Mock dashboard preview */}
        <section id="preview" className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-2xl rounded-3xl" aria-hidden />
          <div className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-background/60 border text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  app.maillead.io/inbound
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider gap-1">
                <Eye className="h-3 w-3" /> Förhandsvisning
              </Badge>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Top KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Besök idag</div>
                  <div className="text-2xl font-semibold mt-0.5">127</div>
                  <div className="text-[11px] text-primary flex items-center gap-0.5 mt-0.5">
                    <ArrowUpRight className="h-3 w-3" /> +24% vs igår
                  </div>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Unika företag</div>
                  <div className="text-2xl font-semibold mt-0.5">34</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">12 nya denna vecka</div>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Kända leads</div>
                  <div className="text-2xl font-semibold mt-0.5">8</div>
                  <div className="text-[11px] text-primary flex items-center gap-0.5 mt-0.5">
                    <Flame className="h-3 w-3" /> 3 heta just nu
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-5 gap-5">
                {/* Visits list */}
                <div className="lg:col-span-3 rounded-lg border bg-background/50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b flex items-center justify-between">
                    <div className="text-sm font-medium">Senaste företagsbesök</div>
                    <span className="text-[11px] text-muted-foreground">Live</span>
                  </div>
                  <ul className="divide-y">
                    {visits.map((v, i) => (
                      <li
                        key={v.name}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                          {v.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{v.name}</span>
                            {v.known && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">Lead</Badge>
                            )}
                            {v.hot && (
                              <Flame className="h-3 w-3 text-primary shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {v.city} · {v.industry}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-medium">{v.pages} sidor</div>
                          <div className="text-[10px] text-muted-foreground">{v.time}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Top pages */}
                <div className="lg:col-span-2 rounded-lg border bg-background/50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b text-sm font-medium">Mest besökta sidor</div>
                  <ul className="p-4 space-y-3">
                    {topPages.map((p) => (
                      <li key={p.path} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-foreground/80 truncate pr-2">{p.path}</span>
                          <span className="text-muted-foreground tabular-nums">{p.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(p.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Activity sparkline */}
              <div className="rounded-lg border bg-background/50 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-primary" /> Aktivitet senaste 14 dagarna
                  </div>
                  <span className="text-[11px] text-muted-foreground">Besök per dag</span>
                </div>
                <Sparkline />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Use cases */}
        <section className="text-center space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Perfekt för</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Sales", "Marketing", "ABM-team", "Founders"].map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full border bg-card text-sm text-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Vi bygger Inbound just nu. Under tiden — fokusera på dina kampanjer
            och Unibox, där svaren landar.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Inbound;
