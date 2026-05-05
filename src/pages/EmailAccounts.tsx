import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Trash2, AlertCircle, CheckCircle2, PenLine, Flame } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useEmailAccounts,
  useDeleteEmailAccount,
  type EmailAccount,
} from "@/hooks/useEmailAccounts";
import { useSendingLimits, useSentToday, useUpdateSendingLimit, effectiveCap } from "@/hooks/useSendingLimits";
import ConnectEmailDialog from "@/components/ConnectEmailDialog";
import EditSignatureDialog from "@/components/EditSignatureDialog";
import { toast } from "sonner";

const EmailAccounts = () => {
  const { t } = useTranslation();
  const { data: accounts, isLoading } = useEmailAccounts();
  const { data: limits = [] } = useSendingLimits();
  const { data: sentToday = {} } = useSentToday();
  const updateLimit = useUpdateSendingLimit();
  const del = useDeleteEmailAccount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailAccount | null>(null);

  const limitFor = (id: string) => limits.find((l) => l.email_account_id === id);

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success(t("emailAccounts.disconnected"));
    } catch {
      toast.error(t("emailAccounts.disconnectFailed"));
    }
  };

  return (
    <Layout>
      <div className="container py-12 max-w-3xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t("emailAccounts.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("emailAccounts.subtitle")}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("emailAccounts.connect")}
          </Button>
        </div>

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
                const { cap, warmupDay } = effectiveCap(limit, acc.created_at);
                const used = sentToday[acc.id] || 0;
                return (
                <div key={acc.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {acc.email}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted uppercase tracking-wider">
                            {acc.provider}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          {acc.status === "active" ? (
                            <><CheckCircle2 className="h-3 w-3 text-success" />{t("emailAccounts.statusActive")}</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 text-destructive" />{acc.status_message || acc.status}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(acc)} title="Edit signature">
                        <PenLine className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)} disabled={del.isPending}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-medium">{used} / {cap} skickade idag</span>
                      {warmupDay !== null && (
                        <span className="text-muted-foreground">· Warm-up dag {warmupDay}/14</span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-muted-foreground">Warm-up</span>
                      <Switch
                        checked={limit?.warmup_enabled ?? true}
                        onCheckedChange={(v) =>
                          updateLimit.mutate({ email_account_id: acc.id, warmup_enabled: v })
                        }
                      />
                    </label>
                  </div>
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
