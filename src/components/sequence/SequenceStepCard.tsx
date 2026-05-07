import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Trash2, Mail, AlertTriangle, CheckCircle2, Sparkles, Loader2, Clock, FileText, ShieldAlert } from "lucide-react";
import { VARIABLE_DEFS, hasUnsubscribeToken } from "@/lib/renderTemplate";
import { analyzeEmail, spamLevel } from "@/lib/emailQuality";
import { RichTextEditor } from "./RichTextEditor";
import type { SequenceStep } from "@/hooks/useSequence";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  step: Partial<SequenceStep> & { step_order: number };
  index: number;
  isLast?: boolean;
  inheritedSubject?: string | null;
  onChange: (patch: Partial<SequenceStep>) => void;
  onDelete?: () => void;
  onFocus?: () => void;
}

export const SequenceStepCard = ({ step, index, isLast, inheritedSubject, onChange, onDelete, onFocus }: Props) => {
  const [subject, setSubject] = useState(step.subject ?? "");
  const [body, setBody] = useState(step.body ?? "");
  const [waitDays, setWaitDays] = useState(step.wait_days ?? (index === 0 ? 0 : 3));
  const editorRef = useRef<Editor | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [improveOpen, setImproveOpen] = useState(false);
  const [improveText, setImproveText] = useState("");
  const [improving, setImproving] = useState(false);

  const handleImprove = async () => {
    if (!improveText.trim()) return;
    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-step", {
        body: { subject, body, instruction: improveText.trim(), is_last: !!isLast },
      });
      if (error || !data?.ok) {
        const status = (error as any)?.context?.status;
        if (status === 402) toast.error("Slut på AI-credits.");
        else if (status === 429) toast.error("AI är upptagen, försök igen.");
        else toast.error("Kunde inte förbättra steget.");
        setImproving(false);
        return;
      }
      setSubject(data.subject ?? subject);
      setBody(data.body ?? body);
      onChange({ subject: data.subject ?? subject, body: data.body ?? body });
      toast.success("Steget uppdaterat");
      setImproveOpen(false);
      setImproveText("");
    } catch (e) {
      console.error(e);
      toast.error("Något gick fel.");
    } finally {
      setImproving(false);
    }
  };

  useEffect(() => {
    setSubject(step.subject ?? "");
    setBody(step.body ?? "");
    setWaitDays(step.wait_days ?? (index === 0 ? 0 : 3));
  }, [step.id]);

  const queueSave = (patch: Partial<SequenceStep>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(patch), 600);
  };

  const insertVariable = (variable: string) => {
    const token = `{{${variable}}}`;
    const ed = editorRef.current;
    if (ed) {
      ed.chain().focus().insertContent(token).run();
      return;
    }
    const next = body + token;
    setBody(next);
    queueSave({ body: next });
  };

  return (
    <Card onFocus={onFocus}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium flex items-center gap-2">
                Email {index + 1}
                {isLast && (
                  hasUnsubscribeToken(body)
                    ? <Badge variant="secondary" className="gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3 text-success" /> Unsubscribe</Badge>
                    : <Badge variant="destructive" className="gap-1 text-[10px]"><AlertTriangle className="h-3 w-3" /> Saknar unsubscribe</Badge>
                )}
              </div>
              {index > 0 && <div className="text-xs text-muted-foreground">Skickas efter föregående steg</div>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Popover open={improveOpen} onOpenChange={setImproveOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Förbättra
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <Label className="text-xs">Hur ska AI:n förbättra steget?</Label>
                  <div className="flex flex-wrap gap-1">
                    {["Gör kortare", "Mer direkt", "Lägg till proof", "Mer personlig"].map(s => (
                      <button key={s} type="button" onClick={() => setImproveText(s)}
                        className="text-[11px] px-2 py-0.5 rounded-full border hover:border-primary hover:bg-primary/5">
                        {s}
                      </button>
                    ))}
                  </div>
                  <Textarea value={improveText} onChange={(e) => setImproveText(e.target.value)}
                    placeholder="t.ex. gör tonen mer avslappnad" className="min-h-[60px] text-sm" />
                  <Button size="sm" onClick={handleImprove} disabled={!improveText.trim() || improving} className="w-full gap-1.5">
                    {improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Förbättra
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {index > 0 && (
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Wait days after previous</Label>
              <Input
                type="number"
                min={0}
                max={90}
                className="w-24"
                value={waitDays}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setWaitDays(v);
                  queueSave({ wait_days: v });
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Subject {index > 0 && <span className="text-muted-foreground">(leave empty to reply in same thread)</span>}</Label>
          <Input
            value={subject}
            placeholder={index > 0 && inheritedSubject ? `Re: ${inheritedSubject}` : "Quick question about {{company}}"}
            onChange={(e) => {
              setSubject(e.target.value);
              queueSave({ subject: e.target.value });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Body</Label>
          <div className="space-y-1.5 rounded-md border border-dashed bg-muted/20 p-2">
            {(["lead", "sender", "system"] as const).map((group) => (
              <div key={group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14 shrink-0">
                  {group === "lead" ? "Lead" : group === "sender" ? "Sender" : "System"}
                </span>
                <div className="flex flex-wrap gap-1">
                  {VARIABLE_DEFS.filter((v) => v.group === group).map((v) => (
                    <Badge
                      key={v.key}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/10 hover:text-primary text-xs"
                      onClick={() => insertVariable(v.key)}
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <RichTextEditor
            value={body}
            placeholder={"Hi {{first_name}}, I noticed {{company}} ..."}
            editorRef={editorRef}
            onChange={(html) => {
              setBody(html);
              queueSave({ body: html });
            }}
          />
          {body.trim() && (() => {
            const q = analyzeEmail(subject, body);
            const lvl = spamLevel(q.spamScore);
            const lvlClasses = lvl === "good"
              ? "border-success/30 bg-success/10 text-success"
              : lvl === "warn"
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-destructive/30 bg-destructive/10 text-destructive";
            return (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                  <FileText className="h-3 w-3" /> {q.wordCount} ord
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                  <Clock className="h-3 w-3" /> {q.readingTimeSec}s lästid
                </span>
                <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${lvlClasses}`}>
                  <ShieldAlert className="h-3 w-3" /> Spam: {lvl === "good" ? "låg" : lvl === "warn" ? "medel" : "hög"}
                  {q.spamHits.length > 0 && <span className="opacity-70">({q.spamHits.slice(0, 2).join(", ")})</span>}
                </span>
                {!q.isPersonalized && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-warning">
                    <AlertTriangle className="h-3 w-3" /> ingen personalisering
                  </span>
                )}
                {q.warnings.map((w) => (
                  <span key={w} className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-warning">
                    <AlertTriangle className="h-3 w-3" /> {w}
                  </span>
                ))}
              </div>
            );
          })()}
          {body && !hasUnsubscribeToken(body) && isLast && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Detta sista mejl saknar <code className="font-mono">{`{{unsubscribe}}`}</code>. En unsubscribe-länk läggs till automatiskt vid utskick, men att lägga den själv förbättrar leveransbarheten.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
