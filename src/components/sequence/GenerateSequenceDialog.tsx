import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  sequenceId: string;
  hasExistingContent: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATES: { id: string; label: string; goal: string }[] = [
  { id: "meeting", label: "Boka möte", goal: "Boka korta intro-möten med beslutsfattare för att presentera vår lösning." },
  { id: "partnership", label: "Erbjud partnerskap", goal: "Erbjuda partnerskap/samarbete till relevanta bolag i samma ekosystem." },
  { id: "reengage", label: "Re-engage gamla leads", goal: "Återaktivera leads som tidigare visat intresse men aldrig konverterade." },
  { id: "event", label: "Event-inbjudan", goal: "Bjuda in målgruppen till ett event/webinar vi arrangerar." },
  { id: "demo", label: "Boka demo", goal: "Få bokade produktdemos med rätt persona." },
];

export const GenerateSequenceDialog = ({ sequenceId, hasExistingContent, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [goal, setGoal] = useState(() => localStorage.getItem("ai_seq_goal") ?? "");
  const [stepCount, setStepCount] = useState(() => localStorage.getItem("ai_seq_steps") ?? "4");
  const [tone, setTone] = useState(() => localStorage.getItem("ai_seq_tone") ?? "professionell men personlig");
  const [length, setLength] = useState(() => localStorage.getItem("ai_seq_length") ?? "medel");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast.error("Beskriv vad du vill åstadkomma med kampanjen");
      return;
    }
    if (hasExistingContent) {
      const ok = window.confirm("Detta ersätter dina befintliga steg. Fortsätta?");
      if (!ok) return;
    }
    localStorage.setItem("ai_seq_goal", goal);
    localStorage.setItem("ai_seq_steps", stepCount);
    localStorage.setItem("ai_seq_tone", tone);
    localStorage.setItem("ai_seq_length", length);

    setLoading(true);
    try {
      const fullTone = `${tone}, längd: ${length}`;
      const { data, error } = await supabase.functions.invoke("generate-sequence", {
        body: {
          sequence_id: sequenceId,
          goal: goal.trim(),
          step_count: Number(stepCount),
          tone: fullTone,
        },
      });

      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) toast.error("Slut på AI-credits — fyll på i Inställningar.");
        else if (status === 429) toast.error("AI är upptagen, försök igen om en stund.");
        else toast.error("Kunde inte generera kampanj.");
        setLoading(false);
        return;
      }

      if (!data?.ok || !Array.isArray(data.steps)) {
        toast.error(data?.error === "missing_company" ? "Slutför onboardingen först." : "Kunde inte generera kampanj.");
        setLoading(false);
        return;
      }

      await supabase.from("sequence_steps").delete().eq("sequence_id", sequenceId);
      const rows = data.steps.map((s: any) => ({
        sequence_id: sequenceId,
        user_id: user!.id,
        step_order: s.step_order,
        subject: s.subject || null,
        body: s.body || "",
        wait_days: s.wait_days ?? 0,
      }));
      const { error: insErr } = await supabase.from("sequence_steps").insert(rows);
      if (insErr) {
        toast.error("Kunde inte spara kampanjen.");
        setLoading(false);
        return;
      }

      toast.success(`Kampanj genererad – ${rows.length} steg`);
      qc.invalidateQueries({ queryKey: ["sequence_steps", sequenceId] });
      setLoading(false);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Något gick fel.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generera kampanj med AI
          </DialogTitle>
          <DialogDescription>
            Vi använder din företagsbeskrivning, dina leads och målet du anger för att bygga hela sekvensen.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative h-16 w-16 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <span className="absolute inset-0 animate-spin" style={{ animationDuration: "4s" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i}
                    className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                    style={{ transform: `rotate(${i * 45}deg) translateY(-28px)`, opacity: 0.3 + (i / 8) * 0.7 }}
                  />
                ))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Skriver din kampanj…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Snabbval</Label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setGoal(tpl.goal)}
                    className="text-xs px-2.5 py-1 rounded-full border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vad vill du åstadkomma?</Label>
              <Textarea
                autoFocus
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Erbjuda partnerskap till IT-konsulter som jobbar med Microsoft 365…"
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Steg</Label>
                <Select value={stepCount} onValueChange={setStepCount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["3","4","5","6"].map(n => <SelectItem key={n} value={n}>{n} steg</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Längd</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kort">Kort</SelectItem>
                    <SelectItem value="medel">Medel</SelectItem>
                    <SelectItem value="lång">Lång</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ton</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avslappnad">Avslappnad</SelectItem>
                    <SelectItem value="professionell men personlig">Professionell</SelectItem>
                    <SelectItem value="direkt och rakt på sak">Direkt</SelectItem>
                    <SelectItem value="formell">Formell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Avbryt</Button>
          <Button onClick={handleGenerate} disabled={loading || !goal.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
