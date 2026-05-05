import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ChoiceOption = { value: string; label: string };

type Step =
  | { type: "text"; key: string; question: string; placeholder?: string }
  | { type: "url"; key: string; question: string; placeholder?: string }
  | { type: "choice"; key: string; question: string; options: ChoiceOption[] }
  | { type: "final"; key: "final" };

const steps: Step[] = [
  { type: "text", key: "name", question: "Vad heter du?", placeholder: "Ditt namn" },
  {
    type: "url",
    key: "company_url",
    question: "Vad är din hemsidas adress?",
    placeholder: "företag.se",
  },
  {
    type: "choice",
    key: "role",
    question: "Vad jobbar du med?",
    options: [
      { value: "saljare", label: "Säljare" },
      { value: "grundare", label: "Grundare" },
      { value: "marknad", label: "Marknad" },
      { value: "byra", label: "Byrå" },
      { value: "annat", label: "Annat" },
    ],
  },
  {
    type: "choice",
    key: "goal",
    question: "Vad är ditt huvudmål?",
    options: [
      { value: "boka_moten", label: "Boka möten" },
      { value: "hitta_kunder", label: "Hitta kunder" },
      { value: "salja_tjanst", label: "Sälja en tjänst" },
      { value: "rekrytera", label: "Rekrytera" },
    ],
  },
  {
    type: "choice",
    key: "monthly_volume",
    question: "Hur många mejl vill du skicka per månad?",
    options: [
      { value: "lt500", label: "Under 500" },
      { value: "500_5000", label: "500–5 000" },
      { value: "5000_20000", label: "5 000–20 000" },
      { value: "gt20000", label: "Mer än 20 000" },
    ],
  },
  {
    type: "choice",
    key: "experience",
    question: "Har du jobbat med kalla mejl tidigare?",
    options: [
      { value: "expert", label: "Ja, jag vet vad jag gör" },
      { value: "lite", label: "Lite grand" },
      { value: "ny", label: "Nej, jag är ny" },
    ],
  },
  {
    type: "choice",
    key: "sender_count",
    question: "Hur många mejladresser har du att skicka från?",
    options: [
      { value: "1", label: "1" },
      { value: "2_5", label: "2–5" },
      { value: "6_10", label: "6–10" },
      { value: "fler", label: "Fler" },
    ],
  },
  { type: "final", key: "final" },
];

type CompanyData = {
  company_name?: string;
  company_target_audience?: string;
  company_value_prop?: string;
  company_description?: string;
  company_scrape_status?: string;
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [scrapeState, setScrapeState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [fallbackDesc, setFallbackDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const step = steps[stepIndex];
  const progress = (stepIndex / (steps.length - 1)) * 100;

  useEffect(() => {
    inputRef.current?.focus();
  }, [stepIndex]);

  const startScrape = async (rawUrl: string) => {
    if (!rawUrl.trim()) return;
    setScrapeState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-company", {
        body: { url: rawUrl.trim() },
      });
      if (error || !data?.ok) {
        setScrapeState("failed");
        return;
      }
      setCompanyData(data);
      setScrapeState("done");
    } catch {
      setScrapeState("failed");
    }
  };

  const canAdvance = useMemo(() => {
    if (step.type === "text") return (answers[step.key] ?? "").trim().length > 0;
    if (step.type === "url") return (answers[step.key] ?? "").trim().length > 0;
    if (step.type === "choice") return !!answers[step.key];
    return true;
  }, [step, answers]);

  const next = () => {
    if (!canAdvance) return;
    if (step.type === "url" && scrapeState === "idle") {
      startScrape(answers[step.key] ?? "");
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step.type !== "final") {
      e.preventDefault();
      next();
    }
  };

  const selectChoice = (value: string) => {
    setAnswers((a) => ({ ...a, [step.key]: value }));
    setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, 180);
  };

  // keyboard 1-9 selects choice
  useEffect(() => {
    if (step.type !== "choice") return;
    const handler = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= step.options.length) {
        selectChoice(step.options[n - 1].value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const finish = async () => {
    if (!user) return;
    setSubmitting(true);
    const payload: Record<string, any> = {
      full_name: answers.name,
      role: answers.role,
      goal: answers.goal,
      monthly_volume: answers.monthly_volume,
      experience: answers.experience,
      sender_count: answers.sender_count,
      onboarding_completed: true,
    };
    if (scrapeState === "failed" && fallbackDesc.trim()) {
      payload.company_description = fallbackDesc.trim();
    }
    const { error } = await supabase.from("profiles").update(payload as any).eq("id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error("Kunde inte spara. Försök igen.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-6 pt-6">
        <Progress value={progress} className="h-1" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          key={stepIndex}
          className="w-full max-w-2xl text-center animate-in fade-in slide-in-from-bottom-6 duration-500"
        >
          <div className="text-xs font-medium tracking-widest text-muted-foreground mb-6">
            {step.type === "final" ? "KLART" : `STEG ${stepIndex + 1} AV ${steps.length - 1}`}
          </div>

          {step.type === "text" && (
            <>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-10">
                {step.question}
              </h1>
              <Input
                ref={inputRef}
                autoFocus
                value={answers[step.key] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [step.key]: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={step.placeholder}
                className="h-14 text-xl text-center border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary bg-transparent"
              />
              <NextHint onNext={next} disabled={!canAdvance} />
            </>
          )}

          {step.type === "url" && (
            <>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
                {step.question}
              </h1>
              <p className="text-muted-foreground mb-10">
                Vi tittar snabbt på din sida för att skräddarsy dina mejl.
              </p>
              <Input
                ref={inputRef}
                autoFocus
                value={answers[step.key] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [step.key]: e.target.value })}
                onBlur={(e) => {
                  if (scrapeState === "idle" && e.target.value.trim()) {
                    startScrape(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={step.placeholder}
                className="h-14 text-xl text-center border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary bg-transparent"
              />
              <NextHint onNext={next} disabled={!canAdvance} />
            </>
          )}

          {step.type === "choice" && (
            <>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-10">
                {step.question}
              </h1>
              <div className="grid gap-3 max-w-md mx-auto">
                {step.options.map((opt, i) => {
                  const selected = answers[step.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectChoice(opt.value)}
                      className={`group flex items-center justify-between text-left px-5 py-4 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 ${
                        selected ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border text-xs font-medium text-muted-foreground group-hover:border-primary group-hover:text-primary">
                          {i + 1}
                        </span>
                        <span className="font-medium">{opt.label}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-8">
                Tryck <Kbd>1-{step.options.length}</Kbd> för att välja
              </p>
            </>
          )}

          {step.type === "final" && (
            <FinalStep
              name={answers.name}
              scrapeState={scrapeState}
              companyData={companyData}
              fallbackDesc={fallbackDesc}
              onFallbackChange={setFallbackDesc}
              submitting={submitting}
              onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1.5 py-0.5 rounded border bg-muted text-foreground font-mono text-[10px]">
    {children}
  </kbd>
);

const NextHint = ({ onNext, disabled }: { onNext: () => void; disabled: boolean }) => (
  <div className="flex items-center justify-center gap-3 mt-8">
    <Button onClick={onNext} disabled={disabled} size="lg" className="gap-2">
      OK <CornerDownLeft className="h-4 w-4" />
    </Button>
    <span className="text-xs text-muted-foreground">
      tryck <Kbd>Enter ↵</Kbd>
    </span>
  </div>
);

const FinalStep = ({
  name,
  scrapeState,
  companyData,
  fallbackDesc,
  onFallbackChange,
  submitting,
  onFinish,
}: {
  name: string;
  scrapeState: "idle" | "loading" | "done" | "failed";
  companyData: CompanyData | null;
  fallbackDesc: string;
  onFallbackChange: (v: string) => void;
  submitting: boolean;
  onFinish: () => void;
}) => {
  if (scrapeState === "loading" || scrapeState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
        </div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Vi analyserar ditt företag…
        </h1>
        <p className="text-muted-foreground">Tar bara några sekunder.</p>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (scrapeState === "failed") {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Perfekt {name}, en sista grej.
        </h1>
        <p className="text-muted-foreground">
          Vi kunde inte hämta info från sidan – beskriv kort vad ditt företag gör så fixar vi resten.
        </p>
        <Textarea
          autoFocus
          value={fallbackDesc}
          onChange={(e) => onFallbackChange(e.target.value)}
          placeholder="Vi hjälper SaaS-bolag att…"
          className="min-h-[120px] text-base"
        />
        <Button size="lg" onClick={onFinish} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sätt upp mitt konto
        </Button>
      </div>
    );
  }

  // done
  const cd = companyData ?? {};
  const lines = [
    `Vi hittade ${cd.company_name || "ditt företag"}.`,
    cd.company_target_audience && cd.company_value_prop
      ? `Ett bolag som hjälper ${cd.company_target_audience} att ${cd.company_value_prop}.`
      : cd.company_description || "",
    "Vi skriver mejl som låter som att de kommer från er.",
  ].filter(Boolean);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-2xl md:text-4xl font-semibold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3"
            style={{ animationDelay: `${i * 400}ms`, animationFillMode: "both", animationDuration: "600ms" }}
          >
            {line}
          </p>
        ))}
      </div>
      <div
        className="animate-in fade-in"
        style={{ animationDelay: `${lines.length * 400 + 200}ms`, animationFillMode: "both", animationDuration: "500ms" }}
      >
        <Button size="lg" onClick={onFinish} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Perfekt {name}, kör igång
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
