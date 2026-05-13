import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Send } from "lucide-react";
import {
  useSequenceSteps,
  useUpsertStep,
  useDeleteStep,
  useSequenceLeads,
} from "@/hooks/useSequence";
import { SequenceStepCard } from "@/components/sequence/SequenceStepCard";
import { EmailPreview, type PreviewLead } from "@/components/sequence/EmailPreview";
import { AiWriteSequenceDialog } from "./AiWriteSequenceDialog";
import { SendTestEmailDialog } from "./SendTestEmailDialog";

export const SequenceTab = ({ sequenceId }: { sequenceId: string }) => {
  const { data: steps = [] } = useSequenceSteps(sequenceId);
  const { data: leads = [] } = useSequenceLeads(sequenceId);
  const upsertStep = useUpsertStep(sequenceId);
  const deleteStep = useDeleteStep(sequenceId);

  const [activeIndex, setActiveIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);

  const leadOptions: PreviewLead[] = useMemo(
    () =>
      leads.map((l) => ({
        id: l.id,
        label: l.full_name || l.email,
        email: l.email,
        full_name: l.full_name,
        first_name: l.first_name,
        last_name: l.last_name,
        company: l.company,
        role: l.role,
        phone: l.phone,
      })),
    [leads],
  );
  const selectedPreviewLead = previewLeadId
    ? leadOptions.find((l) => l.id === previewLeadId) ?? null
    : leadOptions[0] ?? null;

  // Säkerställ att första steget existerar
  useEffect(() => {
    if (steps.length === 0) {
      upsertStep.mutate({ step_order: 0, subject: "", body: "", wait_days: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length === 0]);

  const previewStep = steps[activeIndex] ?? steps[0];
  const inheritedSubject = useMemo(() => {
    if (!previewStep) return null;
    for (let i = previewStep.step_order - 1; i >= 0; i--) {
      const s = steps.find((x) => x.step_order === i);
      if (s?.subject?.trim()) return s.subject;
    }
    return null;
  }, [previewStep, steps]);

  const addFollowUp = async () => {
    await upsertStep.mutateAsync({ step_order: steps.length, subject: "", body: "", wait_days: 3 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Sekvens</h2>
          <p className="text-muted-foreground text-sm">
            Skriv första mejlet och dina uppföljningar. Variabler som <code className="text-xs">{`{{first_name}}`}</code> personaliserar per lead.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTestOpen(true)} className="gap-2">
            <Send className="h-4 w-4" /> Skicka test
          </Button>
          <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Skriv med AI
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {steps.map((s, i) => (
            <SequenceStepCard
              key={s.id}
              step={s}
              index={i}
              isLast={i === steps.length - 1}
              inheritedSubject={i > 0 ? steps[i - 1]?.subject ?? null : null}
              onChange={(patch) => upsertStep.mutate({ ...s, ...patch, step_order: s.step_order })}
              onDelete={steps.length > 1 ? () => deleteStep.mutate(s.id) : undefined}
              onFocus={() => setActiveIndex(i)}
            />
          ))}
          <Button variant="outline" onClick={addFollowUp} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Lägg till uppföljning
          </Button>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <EmailPreview
            subject={previewStep?.subject}
            body={previewStep?.body ?? ""}
            inheritedSubject={inheritedSubject}
            lead={selectedPreviewLead}
            leadOptions={leadOptions}
            selectedLeadId={previewLeadId ?? selectedPreviewLead?.id ?? null}
            onSelectLead={setPreviewLeadId}
          />
        </div>
      </div>

      <AiWriteSequenceDialog
        sequenceId={sequenceId}
        hasExistingContent={steps.some((s) => (s.subject?.trim() || s.body?.trim()))}
        open={aiOpen}
        onOpenChange={setAiOpen}
      />

      <SendTestEmailDialog
        sequenceId={sequenceId}
        open={testOpen}
        onOpenChange={setTestOpen}
        defaultStepId={previewStep?.id ?? null}
      />
    </div>
  );
};
