import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useSequenceSteps, useUpsertStep, useDeleteStep, useSequenceLeads } from "@/hooks/useSequence";
import { SequenceStepCard } from "@/components/sequence/SequenceStepCard";
import { EmailPreview } from "@/components/sequence/EmailPreview";
import { GenerateSequenceDialog } from "@/components/sequence/GenerateSequenceDialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const StepSequence = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: steps = [] } = useSequenceSteps(id);
  const { data: leads = [] } = useSequenceLeads(id);
  const upsertStep = useUpsertStep(id);
  const deleteStep = useDeleteStep(id);

  const [activeIndex, setActiveIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);

  // Add a default first step if none exist
  const ensureFirstStep = async () => {
    if (steps.length === 0) {
      await upsertStep.mutateAsync({ step_order: 0, subject: "", body: "", wait_days: 0 });
    }
  };

  useMemo(() => {
    ensureFirstStep();
  }, [steps.length]);

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
    const nextOrder = steps.length;
    await upsertStep.mutateAsync({ step_order: nextOrder, subject: "", body: "", wait_days: 3 });
  };

  const handleContinue = () => {
    if (steps.length === 0 || !steps.some((s) => s.body.trim())) {
      toast.error(t("sequence.builder.needBody"));
      return;
    }
    navigate(`/sequence/${id}/schedule`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t("sequence.builder.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("sequence.builder.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/sequence/${id}/leads`)}>
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Button>
          <Button onClick={handleContinue}>
            {t("common.continue")} <ArrowRight className="h-4 w-4" />
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
              inheritedSubject={i > 0 ? steps[i - 1]?.subject ?? null : null}
              onChange={(patch) => upsertStep.mutate({ ...s, ...patch, step_order: s.step_order })}
              onDelete={steps.length > 1 ? () => deleteStep.mutate(s.id) : undefined}
              onFocus={() => setActiveIndex(i)}
            />
          ))}
          <Button variant="outline" onClick={addFollowUp} className="w-full gap-2">
            <Plus className="h-4 w-4" /> {t("sequence.builder.addFollowUp")}
          </Button>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <EmailPreview
            subject={previewStep?.subject}
            body={previewStep?.body ?? ""}
            inheritedSubject={inheritedSubject}
            lead={leads[0] ?? null}
          />
        </div>
      </div>
    </div>
  );
};

export default StepSequence;
