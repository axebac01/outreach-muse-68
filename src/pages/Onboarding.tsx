import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
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

const STORAGE_KEY = "onboarding_progress_v1";
const URL_REGEX = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;
const SCRAPE_TIMEOUT_MS = 20000;

const normalizeUrl = (raw: string): string => {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
};

const getDomain = (raw: string): string | null => {
  try {
    return new URL(normalizeUrl(raw)).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const profileFieldMap: Record<string, string> = {
  name: "full_name",
  role: "role",
  goal: "goal",
  monthly_volume: "monthly_volume",
  experience: "experience",
  sender_count: "sender_count",
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [scrapeState, setScrapeState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [scrapeReason, setScrapeReason] = useState<string | null>(null);
  const [fallbackDesc, setFallbackDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrapedFor = useRef<string>("");

  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (typeof parsed.stepIndex === "number")
          setStepIndex(Math.min(parsed.stepIndex, steps.length - 1));
      }
    } catch {
      /* noop */
    }
  }, []);

  // Persist locally on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, stepIndex }));
    } catch {
      /* noop */
    }
  }, [answers, stepIndex]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [stepIndex]);

  // Persist current step's answer to profile (best-effort, fire-and-forget)
  const persistAnswer = (key: string, value: string) => {
    if (!user) return;
    const field = profileFieldMap[key];
    if (!field) return;
    supabase.from("profiles").update({ [field]: value } as any).eq("id", user.id);
  };

  const startScrape = (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url || !URL_REGEX.test(url.replace(/^https?:\/\//i, ""))) return;
    if (scrapedFor.current === url) return;
    scrapedFor.current = url;
    setScrapeState("loading");

    const timeout = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), SCRAPE_TIMEOUT_MS),
    );
    const call = supabase.functions
      .invoke("analyze-company", { body: { url } })
      .then((r) => ({ ...r, timeout: false as const }));

    Promise.race([call, timeout]).then((res: any) => {
      if (res.timeout) {
        setScrapeState("failed");
        return;
      }
      const { data, error } = res;
      if (error || !data?.ok) {
        setScrapeState("failed");
        return;
      }
      setCompanyData(data);
      setScrapeState("done");
    });
  };

  const validateStep = (): boolean => {
    if (step.type === "url") {
      const v = (answers[step.key] ?? "").trim().replace(/^https?:\/\//i, "");
      if (!URL_REGEX.test(v)) {
        setUrlError("Skriv in en giltig adress, t.ex. företag.se");
        return false;
      }
      setUrlError(null);
    }
    return true;
  };

  const canAdvance = useMemo(() => {
    if (step.type === "text") return (answers[step.key] ?? "").trim().length > 0;
    if (step.type === "url") return (answers[step.key] ?? "").trim().length > 0;
    if (step.type === "choice") return !!answers[step.key];
    return true;
  }, [step, answers]);

  const goNext = () => {
    if (!canAdvance) return;
    if (!validateStep()) return;
    if (step.type === "url") {
      startScrape(answers[step.key] ?? "");
    }
    if (step.type === "text" || step.type === "url") {
      persistAnswer(step.key, answers[step.key] ?? "");
    }
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step.type !== "final") {
      e.preventDefault();
      goNext();
    }
  };

  const selectChoice = (value: string) => {
    setAnswers((a) => ({ ...a, [step.key]: value }));
    persistAnswer(step.key, value);
    setTimeout(() => {
      setDirection(1);
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, 280);
  };

  // keyboard shortcuts: 1-9 for choice, Esc/Backspace-on-empty for back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "Escape" && stepIndex > 0 && step.type !== "final") {
        e.preventDefault();
        goBack();
        return;
      }
      if (step.type === "choice" && !inField) {
        const n = parseInt(e.key, 10);
        if (!isNaN(n) && n >= 1 && n <= step.options.length) {
          selectChoice(step.options[n - 1].value);
        }
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    navigate("/dashboard");
  };

  const slideClass =
    direction === 1
      ? "animate-in fade-in slide-in-from-bottom-6 duration-500"
      : "animate-in fade-in slide-in-from-top-6 duration-500";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="px-6 pt-6 flex items-center gap-4">
        {stepIndex > 0 && step.type !== "final" ? (
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Tillbaka"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tillbaka
          </button>
        ) : (
          <span className="w-16" />
        )}
        <div className="flex-1">
          <Progress value={progress} className="h-1 transition-all duration-500" />
        </div>
        <span className="w-16" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div key={stepIndex} className={`w-full max-w-2xl text-center ${slideClass}`}>
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
              <NextHint onNext={goNext} disabled={!canAdvance} />
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
                onChange={(e) => {
                  setAnswers({ ...answers, [step.key]: e.target.value });
                  if (urlError) setUrlError(null);
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && URL_REGEX.test(v.replace(/^https?:\/\//i, ""))) {
                    startScrape(v);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={step.placeholder}
                className="h-14 text-xl text-center border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary bg-transparent"
              />
              {urlError && (
                <p className="text-sm text-destructive mt-3 animate-in fade-in">{urlError}</p>
              )}
              {scrapeState === "loading" && !urlError && (
                <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-2 animate-in fade-in">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Analyserar i bakgrunden…
                </p>
              )}
              <NextHint onNext={goNext} disabled={!canAdvance} />
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
              <p className="text-xs text-muted-foreground mt-8 hidden md:block">
                Tryck <Kbd>1-{step.options.length}</Kbd> för att välja · <Kbd>Esc</Kbd> tillbaka
              </p>
            </>
          )}

          {step.type === "final" && (
            <FinalStep
              name={answers.name}
              domain={getDomain(answers.company_url ?? "")}
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
    <span className="text-xs text-muted-foreground hidden md:inline">
      tryck <Kbd>Enter ↵</Kbd>
    </span>
  </div>
);

const FinalStep = ({
  name,
  domain,
  scrapeState,
  companyData,
  fallbackDesc,
  onFallbackChange,
  submitting,
  onFinish,
}: {
  name: string;
  domain: string | null;
  scrapeState: "idle" | "loading" | "done" | "failed";
  companyData: CompanyData | null;
  fallbackDesc: string;
  onFallbackChange: (v: string) => void;
  submitting: boolean;
  onFinish: () => void;
}) => {
  if (scrapeState === "loading" || scrapeState === "idle") {
    return <AnalysisLoader />;
  }

  if (scrapeState === "failed") {
    return (
      <div className="space-y-6 text-left">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-center">
          Perfekt {name}, en sista grej.
        </h1>
        <p className="text-muted-foreground text-center">
          Vi kunde inte hämta info från sidan – beskriv kort vad ditt företag gör så fixar vi resten.
        </p>
        <Textarea
          autoFocus
          value={fallbackDesc}
          onChange={(e) => onFallbackChange(e.target.value)}
          placeholder="Vi hjälper SaaS-bolag att…"
          className="min-h-[120px] text-base"
        />
        <div className="flex justify-center">
          <Button size="lg" onClick={onFinish} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sätt upp mitt konto
          </Button>
        </div>
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
      {domain && (
        <div
          className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95"
          style={{ animationDuration: "500ms", animationFillMode: "both" }}
        >
          <div className="h-16 w-16 rounded-2xl bg-card border shadow-sm flex items-center justify-center overflow-hidden">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
              alt={cd.company_name || domain}
              className="h-10 w-10 object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          </div>
          <span className="text-xs text-muted-foreground">{domain}</span>
        </div>
      )}
      <div className="space-y-4">
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-2xl md:text-4xl font-semibold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3"
            style={{
              animationDelay: `${i * 450 + 200}ms`,
              animationFillMode: "both",
              animationDuration: "600ms",
            }}
          >
            {line}
          </p>
        ))}
      </div>
      <div
        className="animate-in fade-in"
        style={{
          animationDelay: `${lines.length * 450 + 400}ms`,
          animationFillMode: "both",
          animationDuration: "500ms",
        }}
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

const LOADER_STEPS = [
  "Läser hemsidan…",
  "Förstår erbjudandet…",
  "Hittar målgrupp och vinklar…",
  "Bygger din profil…",
];

const AnalysisLoader = () => {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((i) => (i + 1) % LOADER_STEPS.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-10 py-8">
      {/* Animated orb */}
      <div className="relative h-40 w-40 flex items-center justify-center">
        {/* Outer pulsing rings */}
        <span className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
        <span
          className="absolute inset-4 rounded-full bg-primary/30 blur-xl animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
        {/* Rotating dot ring */}
        <span className="absolute inset-0 animate-spin" style={{ animationDuration: "6s" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-72px)`,
                opacity: 0.2 + (i / 8) * 0.8,
              }}
            />
          ))}
        </span>
        {/* Counter-rotating inner ring */}
        <span
          className="absolute inset-6 animate-spin"
          style={{ animationDuration: "4s", animationDirection: "reverse" }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70"
              style={{ transform: `rotate(${i * 60}deg) translateY(-46px)` }}
            />
          ))}
        </span>
        {/* Center glow */}
        <div className="relative z-10 h-10 w-10 rounded-full bg-primary/40 blur-md animate-pulse" />
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Vi analyserar ditt företag
        </h1>
        <div className="h-6 relative">
          {LOADER_STEPS.map((label, i) => (
            <p
              key={label}
              className={`absolute inset-x-0 text-muted-foreground transition-all duration-500 ${
                i === stepIdx
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              {label}
            </p>
          ))}
        </div>
      </div>

      {/* Skeleton "writing" lines */}
      <div className="w-full max-w-md space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-gradient-to-r from-muted via-primary/30 to-muted bg-[length:200%_100%] animate-shimmer"
            style={{
              width: `${[92, 78, 60][i]}%`,
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Onboarding;
