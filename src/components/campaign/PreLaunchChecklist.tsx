import { CheckCircle2, AlertTriangle, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSequenceSteps, useSequenceSenders, useSequenceLeads, type Sequence } from "@/hooks/useSequence";

type CheckLevel = "ok" | "warn" | "fail";

interface CheckItem {
  level: CheckLevel;
  label: string;
  hint?: string;
}

const Icon = ({ level }: { level: CheckLevel }) => {
  if (level === "ok") return <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />;
  if (level === "warn") return <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />;
  return <Circle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
};

export const PreLaunchChecklist = ({ sequence }: { sequence: Sequence }) => {
  const { data: steps = [] } = useSequenceSteps(sequence.id);
  const { data: senders = [] } = useSequenceSenders(sequence.id);
  const { data: leads = [] } = useSequenceLeads(sequence.id);

  const checks: CheckItem[] = [];

  // Senders
  checks.push(
    senders.length === 0
      ? { level: "fail", label: "Inga avsändarkonton valda", hint: "Välj minst ett konto nedan." }
      : { level: "ok", label: `${senders.length} avsändarkonto${senders.length > 1 ? "n" : ""} valda` },
  );

  // Leads
  checks.push(
    leads.length === 0
      ? { level: "fail", label: "Inga leads tillagda", hint: "Lägg till leads under fliken Leads." }
      : { level: "ok", label: `${leads.length} leads redo att kontaktas` },
  );

  // Steps
  const emptySteps = steps.filter((s: any) => !s.subject?.trim() || !s.body?.trim());
  if (steps.length === 0) {
    checks.push({ level: "fail", label: "Inga sekvenssteg konfigurerade", hint: "Skapa minst ett steg i fliken Sekvens." });
  } else if (emptySteps.length > 0) {
    checks.push({ level: "fail", label: `${emptySteps.length} steg saknar ämne eller innehåll`, hint: "Komplettera tomma steg innan start." });
  } else {
    checks.push({ level: "ok", label: `${steps.length} sekvenssteg klara` });
  }

  // Test prefix warning
  const testSteps = steps.filter((s: any) => /\[?test\]?/i.test(s.subject ?? ""));
  if (testSteps.length > 0) {
    checks.push({
      level: "warn",
      label: `${testSteps.length} steg har "test" i ämnesraden`,
      hint: "Ta bort test-prefix innan du kör skarpt.",
    });
  }

  // Daily limit warning
  if (sequence.daily_limit_per_account > 50) {
    checks.push({
      level: "warn",
      label: `Dagligt tak på ${sequence.daily_limit_per_account} kan skada leveransen`,
      hint: "Rekommenderat: 25 per konto och dag.",
    });
  }

  // Sending window
  if (!sequence.sending_window_start || !sequence.sending_window_end) {
    checks.push({ level: "warn", label: "Sändningsfönster saknas", hint: "Sätt tider under fliken Schema." });
  } else {
    checks.push({
      level: "ok",
      label: `Skickar ${sequence.sending_window_start}–${sequence.sending_window_end} (${sequence.timezone})`,
    });
  }

  // Already active
  if (sequence.status === "active") {
    checks.unshift({ level: "warn", label: "Kampanjen är redan aktiv", hint: "Nya leads schemaläggs vid nästa start." });
  }

  const fails = checks.filter((c) => c.level === "fail").length;
  const warns = checks.filter((c) => c.level === "warn").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Redo att starta?
          {fails === 0 && warns === 0 && (
            <span className="text-xs font-normal text-success">Allt ser bra ut</span>
          )}
          {fails > 0 && (
            <span className="text-xs font-normal text-destructive">{fails} att fixa</span>
          )}
          {fails === 0 && warns > 0 && (
            <span className="text-xs font-normal text-warning">{warns} varning{warns > 1 ? "ar" : ""}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checks.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <Icon level={c.level} />
              <div className="min-w-0">
                <div className={c.level === "fail" ? "text-destructive" : ""}>{c.label}</div>
                {c.hint && <div className="text-xs text-muted-foreground">{c.hint}</div>}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
