import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type CheckResult = {
  status: "ok" | "missing";
  policy?: string;
  selector?: string;
  record?: string | null;
  message?: string;
};

type DnsReport = {
  domain: string;
  spf: CheckResult;
  dkim: CheckResult;
  dmarc: CheckResult;
  score: "good" | "warn" | "bad";
};

function Row({ label, result }: { label: string; result: CheckResult }) {
  const ok = result.status === "ok";
  return (
    <div className="flex items-start gap-2 text-xs">
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
        : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
      <div className="flex-1">
        <span className="font-medium">{label}</span>{" "}
        {ok
          ? <span className="text-muted-foreground">
            {result.policy ? `(p=${result.policy})` : result.selector ? `(selector: ${result.selector})` : "OK"}
          </span>
          : <span className="text-destructive">{result.message ?? "Saknas"}</span>}
      </div>
    </div>
  );
}

export default function DeliverabilityCheck({ email, provider, accountId }: { email: string; provider: string; accountId?: string }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DnsReport | null>(null);
  const domain = email.split("@")[1] ?? "";
  const qc = useQueryClient();

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-deliverability", {
        body: { domain, provider },
      });
      if (error) throw error;
      setReport(data as DnsReport);
      // Persistera resultatet på kontot så att banner-varningen uppdateras
      // och status-fältet `deliverability_check` stämmer överens med vad
      // användaren just såg.
      if (accountId && data) {
        await supabase
          .from("email_accounts")
          .update({
            deliverability_check: data,
            deliverability_checked_at: new Date().toISOString(),
          })
          .eq("id", accountId);
        qc.invalidateQueries({ queryKey: ["email_accounts"] });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "DNS-kontroll misslyckades");
    } finally {
      setLoading(false);
    }
  };


  if (!report) {
    return (
      <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        Kontrollera DNS (SPF/DKIM/DMARC)
      </Button>
    );
  }

  const ScoreIcon = report.score === "good" ? CheckCircle2 : report.score === "warn" ? AlertTriangle : XCircle;
  const scoreColor = report.score === "good" ? "text-success" : report.score === "warn" ? "text-warning" : "text-destructive";
  const scoreText = report.score === "good"
    ? "Bra deliverability-uppsättning"
    : report.score === "warn"
    ? "Förbättringar rekommenderas"
    : "Hög risk för spam-mappen";

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <ScoreIcon className={`h-4 w-4 ${scoreColor}`} />
          <span>{scoreText}</span>
          <span className="text-muted-foreground font-normal">· {domain}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={run} disabled={loading} className="h-6 px-2 text-xs">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kör om"}
        </Button>
      </div>
      <div className="space-y-1">
        <Row label="SPF" result={report.spf} />
        <Row label="DKIM" result={report.dkim} />
        <Row label="DMARC" result={report.dmarc} />
      </div>
      {report.score !== "good" && (
        <p className="text-[11px] text-muted-foreground pt-1 border-t">
          Lägg till saknade DNS-poster hos din domänleverantör. Detta är ett krav för att hamna i inkorgen — inte spam.
        </p>
      )}
    </div>
  );
}
