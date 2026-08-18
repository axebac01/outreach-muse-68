import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/CopyButton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  dkimGuide,
  dmarcValue,
  dnsPanels,
  senderKind,
  spfValue,
} from "@/lib/dnsGuides";

type Check = { status?: string; record?: string | null; policy?: string; selector?: string };
export type DnsReportLike = {
  domain?: string;
  spf?: Check;
  dkim?: Check;
  dmarc?: Check;
  score?: string;
};

type Props = {
  domain: string;
  provider: string;
  report: DnsReportLike;
  accountId?: string;
  trigger?: React.ReactNode;
};

const RecordRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="w-16 shrink-0 pt-1 text-xs text-muted-foreground">{label}</span>
    <code className="flex-1 min-w-0 break-all whitespace-pre-wrap rounded bg-muted px-2 py-1 text-xs">{value}</code>
    <CopyButton text={value} label="" />
  </div>
);


const DnsFixDialog = ({ domain, provider, report, accountId, trigger }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [current, setCurrent] = useState<DnsReportLike>(report);
  const qc = useQueryClient();

  const kind = senderKind(provider);
  const dkim = dkimGuide(kind);

  const recheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-deliverability", {
        body: { domain, provider },
      });
      if (error) throw error;
      setCurrent(data as DnsReportLike);
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
      if ((data as DnsReportLike)?.score === "good") {
        toast.success(t("emailAccounts.dnsFix.allGood"));
      }
    } catch (e: any) {
      toast.error(e?.message ?? t("emailAccounts.dnsFix.checkFailed"));
    } finally {
      setChecking(false);
    }
  };

  const ok = (c?: Check) => c?.status === "ok";

  const Status = ({ c }: { c?: Check }) =>
    ok(c) ? (
      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive shrink-0" />
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            {t("emailAccounts.dnsFix.open")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{t("emailAccounts.dnsFix.title")}</DialogTitle>
          <DialogDescription>
            {t("emailAccounts.dnsFix.subtitle", { domain })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* SPF */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Status c={current.spf} /> SPF
            </div>
            <p className="text-xs text-muted-foreground">{t("emailAccounts.dnsFix.spfDesc")}</p>
            {ok(current.spf) ? (
              <p className="text-xs text-muted-foreground break-all">{current.spf?.record}</p>
            ) : (
              <div className="space-y-1.5">
                <RecordRow label={t("emailAccounts.dnsFix.type")} value="TXT" />
                <RecordRow label={t("emailAccounts.dnsFix.name")} value="@" />
                <RecordRow label={t("emailAccounts.dnsFix.value")} value={spfValue(kind)} />
                <p className="text-[11px] text-muted-foreground">
                  {t("emailAccounts.dnsFix.spfHint")}
                </p>
              </div>
            )}
          </div>

          {/* DKIM */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Status c={current.dkim} /> DKIM
            </div>
            <p className="text-xs text-muted-foreground">{t("emailAccounts.dnsFix.dkimDesc")}</p>
            {ok(current.dkim) ? (
              <p className="text-xs text-muted-foreground break-all">
                {t("emailAccounts.dnsFix.selector")}: {current.dkim?.selector}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("emailAccounts.dnsFix.dkimHint", { provider: dkim.provider })}
                </p>
                <a
                  href={dkim.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t("emailAccounts.dnsFix.dkimLink", { provider: dkim.provider })}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>

          {/* DMARC */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Status c={current.dmarc} /> DMARC
            </div>
            <p className="text-xs text-muted-foreground">{t("emailAccounts.dnsFix.dmarcDesc")}</p>
            {ok(current.dmarc) ? (
              <p className="text-xs text-muted-foreground break-all">{current.dmarc?.record}</p>
            ) : (
              <div className="space-y-1.5">
                <RecordRow label={t("emailAccounts.dnsFix.type")} value="TXT" />
                <RecordRow label={t("emailAccounts.dnsFix.name")} value={`_dmarc.${domain}`} />
                <RecordRow label={t("emailAccounts.dnsFix.value")} value={dmarcValue(domain)} />
                <p className="text-[11px] text-muted-foreground">
                  {t("emailAccounts.dnsFix.dmarcHint")}
                </p>
              </div>
            )}
          </div>

          {/* Var lägger jag in det? */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="text-sm font-medium">{t("emailAccounts.dnsFix.whereTitle")}</div>
            <p className="text-xs text-muted-foreground">{t("emailAccounts.dnsFix.whereDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {dnsPanels.map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-accent"
                >
                  {p.name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("emailAccounts.dnsFix.propagation")}</p>
          </div>

          <Button onClick={recheck} disabled={checking} className="w-full gap-2">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("emailAccounts.dnsFix.recheck")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DnsFixDialog;
