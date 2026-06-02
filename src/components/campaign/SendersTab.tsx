import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Rocket, AlertTriangle, Mail, RefreshCw } from "lucide-react";
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
import { PreLaunchChecklist } from "./PreLaunchChecklist";

export const SendersTab = ({ sequence }: { sequence: Sequence }) => {
  const navigate = useNavigate();
  const { data: accounts = [] } = useEmailAccounts();
  const { data: senders = [] } = useSequenceSenders(sequence.id);
  const { data: leads = [] } = useSequenceLeads(sequence.id);
  const toggleSender = useToggleSender(sequence.id);
  const update = useUpdateSequence(sequence.id);
  const [launching, setLaunching] = useState(false);

  const { data: scheduledCount = 0 } = useQuery({
    queryKey: ["scheduled_sends_count", sequence.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("scheduled_sends")
        .select("id", { count: "exact", head: true })
        .eq("sequence_id", sequence.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const selectedSenderIds = new Set(senders.map((s) => s.email_account_id));
  const dailyLimit = sequence.daily_limit_per_account;
  const totalCapacity = senders.length * dailyLimit;
  const daysNeeded = totalCapacity > 0 ? Math.max(1, Math.ceil(leads.length / totalCapacity)) : 0;

  const launch = async () => {
    if (senders.length === 0) {
      toast.error("Välj minst ett avsändarkonto.");
      return;
    }
    if (leads.length === 0) {
      toast.error("Lägg till några leads först.");
      return;
    }
    setLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke("launch-sequence", {
        body: { sequence_id: sequence.id },
      });
      if (error) throw error;
      toast.success(`Kampanj startad! ${data?.scheduled ?? leads.length} mejl schemalagda.`);
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte starta");
    } finally {
      setLaunching(false);
    }
  };

  const isActive = sequence.status === "active";
  const isTrulyLaunched = isActive && scheduledCount > 0;
  const isStuckActive = isActive && scheduledCount === 0;
  const brokenAccounts = accounts.filter(
    (a) => selectedSenderIds.has(a.id) && /invalid_grant|expired|revoked/i.test(a.status_message ?? ""),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">Avsändare & start</h2>
        <p className="text-muted-foreground text-sm">Välj inkorgar och starta kampanjen.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Avsändarkonton</CardTitle></CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center space-y-3">
              <Mail className="h-8 w-8 mx-auto opacity-50" />
              <div>Inga anslutna mejlkonton än.</div>
              <Button asChild size="sm">
                <Link to="/email-accounts">Anslut ett mejlkonto</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => {
                const checked = selectedSenderIds.has(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleSender.mutate({ accountId: a.id, enabled: !!v })} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{a.email}</div>
                      <div className="text-xs text-muted-foreground">{a.provider} · {a.status}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sändningsgränser</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Dagligt tak per konto</Label>
            <Input type="number" min={1} max={500} value={dailyLimit}
              onChange={(e) => update.mutate({ daily_limit_per_account: Number(e.target.value) || 25 })}
              className="w-32" />
            <p className="text-xs text-muted-foreground">Rekommenderat: 25 mejl per konto och dag för bästa leverans.</p>
          </div>
          {dailyLimit > 50 && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Att skicka över 50 mejl per dag och konto kan skada din leverans.</span>
            </div>
          )}
          {senders.length > 0 && leads.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              Med {leads.length} leads över {senders.length} konto(n) à {dailyLimit}/dag tar kampanjen ~{daysNeeded} dag(ar).
            </div>
          )}
        </CardContent>
      </Card>

      {brokenAccounts.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">Återanslut kontot för att kunna skicka</div>
            <div className="text-xs mt-1">
              {brokenAccounts.map((a) => a.email).join(", ")} har en utgången inloggning.
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link to="/email-accounts"><RefreshCw className="h-3 w-3" />Återanslut</Link>
          </Button>
        </div>
      )}

      {isStuckActive && (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 text-warning p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Kampanjen är markerad som aktiv men inga utskick är schemalagda. Klicka <strong>Starta kampanj</strong> igen för att schemalägga utskicken.</span>
        </div>
      )}

      <PreLaunchChecklist sequence={sequence} />

      <div className="flex justify-end">
        <Button size="lg" variant="hero" onClick={launch}
          disabled={launching || isTrulyLaunched || senders.length === 0 || leads.length === 0}
          className="gap-2">
          <Rocket className="h-4 w-4" />
          {isTrulyLaunched ? "Kampanj aktiv" : launching ? "Startar..." : "Starta kampanj"}
        </Button>
      </div>
    </div>
  );
};
