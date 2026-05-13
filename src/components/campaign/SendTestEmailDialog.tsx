import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSequenceSenders, useSequenceSteps, useSequenceLeads } from "@/hooks/useSequence";
import { useEmailAccounts } from "@/hooks/useEmailAccounts";
import { useAuth } from "@/context/AuthContext";
import { renderTemplate, type RenderVars } from "@/lib/renderTemplate";
import { sanitizeEmailHtml } from "@/lib/sanitizeHtml";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

const SAMPLE: RenderVars = {
  first_name: "Alex",
  last_name: "Smith",
  full_name: "Alex Smith",
  company: "Acme Inc",
  role: "Head of Sales",
  email: "alex@acme.com",
  phone: "+46 70 123 45 67",
};

interface Props {
  sequenceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultStepId?: string | null;
}

export const SendTestEmailDialog = ({ sequenceId, open, onOpenChange, defaultStepId }: Props) => {
  const { user } = useAuth();
  const { data: senders = [] } = useSequenceSenders(sequenceId);
  const { data: accounts = [] } = useEmailAccounts();
  const { data: steps = [] } = useSequenceSteps(sequenceId);
  const { data: leads = [] } = useSequenceLeads(sequenceId);

  const senderAccounts = useMemo(
    () => accounts.filter((a) => senders.some((s) => s.email_account_id === a.id)),
    [accounts, senders],
  );

  const [accountId, setAccountId] = useState<string>("");
  const [to, setTo] = useState("");
  const [stepId, setStepId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("__sample__");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!accountId && senderAccounts[0]) setAccountId(senderAccounts[0].id);
    if (!to && user?.email) setTo(user.email);
    if (!stepId) setStepId(defaultStepId || steps[0]?.id || "");
  }, [open, senderAccounts, user, steps, defaultStepId]); // eslint-disable-line

  const step = steps.find((s) => s.id === stepId);
  const account = senderAccounts.find((a) => a.id === accountId);
  const lead = leadId === "__sample__" ? null : leads.find((l) => l.id === leadId);

  const inheritedSubject = useMemo(() => {
    if (!step) return null;
    for (let i = step.step_order - 1; i >= 0; i--) {
      const s = steps.find((x) => x.step_order === i);
      if (s?.subject?.trim()) return s.subject;
    }
    return null;
  }, [step, steps]);

  const vars: RenderVars = {
    ...SAMPLE,
    ...(lead ?? {}),
    sender_name: account?.sender_name ?? account?.display_name ?? "",
    sender_email: account?.email ?? "",
    sender_signature: account?.signature ?? "",
    unsubscribe_url: "#test-preview",
  };

  const finalSubject = step?.subject?.trim() ? step.subject : inheritedSubject ?? "";
  const renderedSubject = renderTemplate(finalSubject, vars);
  const renderedBody = renderTemplate(step?.body ?? "", vars);

  const handleSend = async () => {
    if (!accountId || !to || !step) {
      toast.error("Välj avsändare, mottagare och steg");
      return;
    }
    setSending(true);
    try {
      const subject = `[TEST] ${renderedSubject || "(no subject)"}`;
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          email_account_id: accountId,
          to,
          subject,
          body_html: renderedBody,
        },
      });
      if (error) throw new Error(error.message || "Send failed");
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Test skickat till ${to}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte skicka testmejl");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skicka testmejl</DialogTitle>
          <DialogDescription>
            Skicka ett mejl till dig själv för att kontrollera att variabler och avsändare fungerar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Avsändarkonto</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj avsändare" />
                </SelectTrigger>
                <SelectContent>
                  {senderAccounts.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Inga avsändare kopplade till kampanjen.
                    </div>
                  ) : (
                    senderAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Steg</Label>
              <Select value={stepId} onValueChange={setStepId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj steg" />
                </SelectTrigger>
                <SelectContent>
                  {steps.map((s, i) => (
                    <SelectItem key={s.id} value={s.id}>
                      Steg {i + 1}{s.subject ? ` – ${s.subject.slice(0, 40)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Till</Label>
              <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="din@mejl.se" />
            </div>
            <div className="space-y-1.5">
              <Label>Variabler från</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__sample__">Exempeldata</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.full_name || l.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Förhandsvisning</div>
            <div className="text-sm font-medium">
              [TEST] {renderedSubject || <span className="italic text-muted-foreground">(no subject)</span>}
            </div>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed bg-background rounded p-3 border min-h-[120px]"
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(renderedBody) || "<em class='text-muted-foreground'>Tomt</em>" }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={sending || !accountId || !to || !step} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Skicka test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
