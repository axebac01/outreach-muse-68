import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Mail, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Countdown from "@/components/Countdown";
import { LAUNCH_DATE } from "@/config/launch";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  full_name: z.string().trim().min(2, "Ange ditt namn").max(100),
  email: z.string().trim().email("Ange en giltig e-postadress").max(255),
  company: z.string().trim().min(1, "Ange företag").max(120),
});

const Mark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="wl-tile" x1="6" y1="4" x2="66" y2="68" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2C281F" />
        <stop offset="1" stopColor="#1B1813" />
      </linearGradient>
      <linearGradient id="wl-ember" x1="50" y1="11" x2="60" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#F4801F" />
        <stop offset="1" stopColor="#E0512B" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="68" height="68" rx="19" fill="url(#wl-tile)" />
    <path d="M15 54 L15 28 L36 45 L57 28" stroke="#F6F1E8" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M57 54 L57 28" stroke="#F6F1E8" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M57 26 L57 13" stroke="url(#wl-ember)" strokeWidth="6.2" strokeLinecap="round" />
    <path d="M51.5 18.5 L57 12.5 L62.5 18.5" stroke="url(#wl-ember)" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const Waitlist = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", company: "" });
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("launch_interest").insert({
      email: parsed.data.email.toLowerCase(),
      full_name: parsed.data.full_name,
      company: parsed.data.company,
      feature: "waitlist",
      source: "waitlist_2026_august",
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("Du står redan på listan", {
          description: "Vi hör av oss inför launch den 15 augusti.",
        });
        setDone(true);
        return;
      }
      toast.error("Något gick fel", { description: error.message });
      return;
    }
    toast.success("Tack — du är med!", {
      description: "Vi mejlar dig så snart MailLead.ai öppnar.",
    });
    setDone(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Helmet>
        <title>Väntelista — MailLead.ai öppnar 15 augusti</title>
        <meta
          name="description"
          content="MailLead.ai går live den 15 augusti 2026. Säkra din plats på väntelistan — tidiga användare får extra gratis-credits vid launch."
        />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href="https://maillead.ai/waitlist" />
      </Helmet>

      {/* Bakgrundseffekter */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #F4801F 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, #E0512B 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #D9920F 0%, transparent 70%)" }}
        />
      </div>

      {/* Top bar */}
      <header className="container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-display text-lg font-extrabold tracking-tight">
            Mail<span className="text-primary">Lead</span>
            <span className="text-muted-foreground">.ai</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Byt tema"
            className="rounded-md border border-border/60 p-2 hover:bg-accent"
          >
            {mounted ? (isDark ? <Sun size={16} /> : <Moon size={16} />) : <span className="block h-4 w-4" />}
          </button>
          <Button variant="ghost" asChild size="sm">
            <Link to="/login">Logga in</Link>
          </Button>
        </div>
      </header>

      <main className="container pb-20 pt-6 sm:pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Soft launch — begränsade platser
          </span>
          <h1 className="mt-6 font-display text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Vi öppnar{" "}
            <em
              className="not-italic bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #E0512B 0%, #F4801F 50%, #D9920F 100%)",
              }}
            >
              15 augusti
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-muted-foreground">
            MailLead.ai går live för alla i augusti. Säkra din plats nu — tidiga
            användare får <strong className="text-foreground">50 extra gratis-credits</strong> vid launch.
          </p>

          <div className="mt-10">
            <Countdown target={LAUNCH_DATE} />
          </div>

          {/* Form / success */}
          <div className="mx-auto mt-12 max-w-md">
            {done ? (
              <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-xl text-left space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Du är med på listan</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vi hör av oss på <strong className="text-foreground">{form.email || "din e-post"}</strong> så snart vi öppnar
                  den 15 augusti. Vill du komma in tidigare? Mejla oss på{" "}
                  <a href="mailto:info@maillead.ai" className="text-primary hover:underline">
                    info@maillead.ai
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-xl text-left space-y-4 shadow-[0_20px_60px_-20px_hsl(var(--foreground)/0.25)]"
              >
                <div className="space-y-2">
                  <Label htmlFor="full_name">Namn</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Förnamn Efternamn"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Jobbmejl</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="du@foretag.se"
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Företag</Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Företagets namn"
                    required
                    maxLength={120}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? "Skickar..." : (<>Säkra min plats <ArrowRight className="h-4 w-4" /></>)}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Inget kreditkort. Vi mejlar endast om launch.
                </p>
              </form>
            )}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3 text-left">
            {[
              ["AI-drivna utskick", "Personliga kalla mejl per lead — utan timmar av research."],
              ["Köp B2B-leads", "Hitta nya kunder direkt i appen via vår leadmarknad."],
              ["Smart uppföljning", "Schemalägg sekvenser och låt AI:n följa upp automatiskt."],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Mail className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Waitlist;
