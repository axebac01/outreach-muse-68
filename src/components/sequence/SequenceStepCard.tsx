import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Trash2, Mail, AlertTriangle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { VARIABLE_DEFS, hasUnsubscribeToken } from "@/lib/renderTemplate";
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const ta = bodyRef.current;
    const token = `{{${variable}}}`;
    if (!ta) {
      const next = body + token;
      setBody(next);
      queueSave({ body: next });
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    queueSave({ body: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <Card onFocus={onFocus}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Email {index + 1}</div>
              {index > 0 && (
                <div className="text-xs text-muted-foreground">Sent after previous step</div>
              )}
            </div>
          </div>
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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
          <Textarea
            ref={bodyRef}
            value={body}
            placeholder={`Hi {{first_name}},\n\nI noticed {{company}} ...`}
            rows={10}
            onChange={(e) => {
              setBody(e.target.value);
              queueSave({ body: e.target.value });
            }}
          />
          {body && !hasUnsubscribeToken(body) && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
              <span>
                This email is missing <code className="font-mono">{`{{unsubscribe}}`}</code>. An unsubscribe link will be appended automatically, but adding one yourself improves deliverability.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
