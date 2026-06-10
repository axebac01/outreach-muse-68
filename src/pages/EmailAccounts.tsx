import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Trash2, AlertCircle, CheckCircle2, PenLine, Flame, Info, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useEmailAccounts,
  useDeleteEmailAccount,
  useReactivateEmailAccount,
  type EmailAccount,
} from "@/hooks/useEmailAccounts";
import { useSendingLimits, useSentToday, useUpdateSendingLimit, effectiveCap } from "@/hooks/useSendingLimits";

import ConnectEmailDialog from "@/components/ConnectEmailDialog";
import EditSignatureDialog from "@/components/EditSignatureDialog";
import DeliverabilityCheck from "@/components/DeliverabilityCheck";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errorMessages";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PlanLimitBanner } from "@/components/PlanLimitBanner";


const EmailAccounts = () => {
  const { t } = useTranslation();
  const { data: accounts, isLoading, error, refetch, isFetching } = useEmailAccounts();
  const { data: limits = [] } = useSendingLimits();
  const { data: sentToday = {} } = useSentToday();
  const updateLimit = useUpdateSendingLimit();
  const del = useDeleteEmailAccount();
  const reactivate = useReactivateEmailAccount();

  const { limits: planLimits } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailAccount | null>(null);

  const accountCount = accounts?.length ?? 0;
  const planCap = planLimits?.email_accounts ?? -1;
  const atLimit = planCap >= 0 && accountCount >= planCap;

  const limitFor = (id: string) => limits.find((l) => l.email_account_id === id);


  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success(t("emailAccounts.disconnected"));
    } catch {
      toast.error(t("emailAccounts.disconnectFailed"));
    }
  };

  const handleReconnect = async (acc: EmailAccount) => {
    try {
      const provider = acc.provider === "outlook" ? "microsoft" : "google";
      const redirect_uri = `${window.location.origin}/oauth/callback`;
      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider, redirect_uri },
      });
      if (error || data?.error || !data?.url) {
        throw data?.error ?? error ?? new Error("oauth_start_failed");
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "errors.auth.oauthFailed"));
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivate.mutateAsync(id);
      toast.success(t("emailAccounts.reactivated"));
    } catch (e) {
      toast.error(toUserMessage(e, t));
    }
  };



  return (
    <Layout>
      <div className="container py-8 md:py-12 max-w-3xl">
        <div className="flex items-start justify-between gap-3 mb-6 md:mb-8 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">{t("emailAccounts.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {t("emailAccounts.subtitle")}
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={atLimit}
            title={atLimit ? "Du har nått taket för din plan" : undefined}
          >
            <Plus className="h-4 w-4" /> {t("emailAccounts.connect")}
          </Button>
        </div>

        {atLimit && planLimits && (
          <div className="mb-6">
            <PlanLimitBanner resource="email_accounts" currentPlan={planLimits.plan} />
          </div>
        )}



        {isLoading
          ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl border bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          )
          : error
          ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="font-semibold mb-1">Kunde inte ladda dina konton</h3>
              <p className="text-sm text-muted-foreground mb-4 break-words">
                {(error as Error)?.message || "Okänt fel vid hämtning."}
              </p>
              <Button onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Försök igen
              </Button>
            </div>
          )
          : !accounts || accounts.length === 0
          ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">
                {t("emailAccounts.emptyTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("emailAccounts.emptyDesc")}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                {t("emailAccounts.connect")}
              </Button>
            </div>
          )
          : (
            <div className="space-y-3">
              {accounts.map((acc) => {
                const limit = limitFor(acc.id);
                const { cap, rampUpDay, providerCeiling } = effectiveCap(limit, acc.created_at, acc.provider);
                const used = sentToday[acc.id] || 0;
                return (
                <div key={acc.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          <span className="break-all">{acc.email}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted uppercase tracking-wider shrink-0">
                            {acc.provider}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {acc.status === "active" ? (
                            <><CheckCircle2 className="h-3 w-3 text-success shrink-0" />{t("emailAccounts.statusActive")}</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 text-destructive shrink-0" /><span className="break-words">{acc.status_message || acc.status}</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      {acc.status === "paused_bounce" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleReactivate(acc.id)}
                          disabled={reactivate.isPending}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("emailAccounts.reactivate")}</span>
                        </Button>
                      )}
                      {acc.auth_type === "oauth" && acc.status !== "active" && acc.status !== "paused_bounce" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleReconnect(acc)}
                          title={t("emailAccounts.reconnectHint")}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("emailAccounts.reconnect")}</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setEditing(acc)} title="Edit signature">
                        <PenLine className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)} disabled={del.isPending}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>

                  </div>

                  {acc.status === "paused_bounce" && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{t("emailAccounts.pausedBounceTitle")}</div>
                        <div className="text-xs mt-0.5 text-destructive/90">
                          {acc.status_message || t("emailAccounts.pausedBounceDesc")}
                        </div>
                      </div>
                    </div>
                  )}

                  {acc.deliverability_check && acc.deliverability_check.score !== "good" && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-medium">{t("emailAccounts.deliverabilityWarnTitle")}</div>
                        <div className="text-xs">
                          {[
                            acc.deliverability_check.spf?.status !== "ok" && "SPF",
                            acc.deliverability_check.dkim?.status !== "ok" && "DKIM",
                            acc.deliverability_check.dmarc?.status !== "ok" && "DMARC",
                          ].filter(Boolean).join(", ")} {t("emailAccounts.deliverabilityWarnMissing")}
                        </div>
                      </div>
                    </div>
                  )}


                  <div className="rounded-lg bg-muted/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Flame className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium">{used} / {cap} skickade idag</span>
                      {rampUpDay !== null && (
                        <span className="text-muted-foreground">· Ramp up dag {rampUpDay}/14</span>
                      )}
                      <span className="text-muted-foreground">· Tak {providerCeiling}/dag ({acc.provider})</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer self-end sm:self-auto">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Ramp up
                        <span
                          title="Ramp up trappar gradvis upp ditt dagliga sändtak under de första 14 dagarna för ett nytt konto (start 20/dag → upp till providerns tak). Det här är inte domän-/inbox-warmup — vi skickar inga interna mejl och påverkar inte din avsändarreputation."
                          className="inline-flex"
                        >
                          <Info className="h-3 w-3" />
                        </span>
                      </span>
                      <Switch
                        checked={limit?.warmup_enabled ?? true}
                        onCheckedChange={(v) =>
                          updateLimit.mutate({ email_account_id: acc.id, warmup_enabled: v })
                        }
                      />
                    </label>
                  </div>

                  <DeliverabilityCheck email={acc.email} provider={acc.provider} />
                </div>
              );})}
            </div>
          )}

        <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            {t("emailAccounts.oauthSoon")}
          </p>
          <p>{t("emailAccounts.oauthSoonDesc")}</p>
        </div>
      </div>

      <ConnectEmailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EditSignatureDialog
        account={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
    </Layout>
  );
};

export default EmailAccounts;
