import { useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Rocket, AlertTriangle, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useSequenceSenders,
  useToggleSender,
  useUpdateSequence,
  useSequenceLeads,
  type Sequence,
} from "@/hooks/useSequence";
import { useEmailAccounts } from "@/hooks/useEmailAccounts";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const StepSending = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { sequence } = useOutletContext<{ sequence: Sequence }>();
  const { data: accounts = [] } = useEmailAccounts();
  const { data: senders = [] } = useSequenceSenders(id);
  const { data: leads = [] } = useSequenceLeads(id);
  const toggleSender = useToggleSender(id);
  const update = useUpdateSequence(id);
  const [launching, setLaunching] = useState(false);

  const selectedSenderIds = new Set(senders.map((s) => s.email_account_id));
  const dailyLimit = sequence.daily_limit_per_account;

  const totalCapacity = senders.length * dailyLimit;
  const daysNeeded = totalCapacity > 0 ? Math.max(1, Math.ceil(leads.length / totalCapacity)) : 0;

  const launch = async () => {
    if (senders.length === 0) {
      toast.error(t("sequence.sending.needSender"));
      return;
    }
    if (leads.length === 0) {
      toast.error(t("sequence.sending.needLeads"));
      return;
    }
    setLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke("launch-sequence", {
        body: { sequence_id: id },
      });
      if (error) throw error;
      toast.success(t("sequence.sending.launched", { count: data?.scheduled ?? leads.length }));
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Launch failed");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t("sequence.sending.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("sequence.sending.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/sequence/${id}/schedule`)}>
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sequence.sending.accountsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center space-y-3">
              <Mail className="h-8 w-8 mx-auto opacity-50" />
              <div>{t("sequence.sending.noAccounts")}</div>
              <Button asChild size="sm">
                <Link to="/settings/email-accounts">{t("sequence.sending.connectAccount")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => {
                const checked = selectedSenderIds.has(a.id);
                return (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        toggleSender.mutate({ accountId: a.id, enabled: !!v })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{a.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.provider} · {a.status}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sequence.sending.limitTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">{t("sequence.sending.dailyLimit")}</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={dailyLimit}
              onChange={(e) => update.mutate({ daily_limit_per_account: Number(e.target.value) || 25 })}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">{t("sequence.sending.recommended")}</p>
          </div>
          {dailyLimit > 50 && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("sequence.sending.warning")}</span>
            </div>
          )}
          {senders.length > 0 && leads.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              {t("sequence.sending.estimate", {
                leads: leads.length,
                accounts: senders.length,
                limit: dailyLimit,
                days: daysNeeded,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          variant="hero"
          onClick={launch}
          disabled={launching || senders.length === 0 || leads.length === 0}
          className="gap-2"
        >
          <Rocket className="h-4 w-4" />
          {launching ? t("sequence.sending.launching") : t("sequence.sending.launch")}
        </Button>
      </div>
    </div>
  );
};

export default StepSending;
