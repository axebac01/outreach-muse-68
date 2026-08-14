import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: { campaignId: string; sequenceId: string; name: string }) => void;
}

export default function CreateCampaignInlineDialog({ open, onOpenChange, onCreated }: Props) {
  const createCampaign = useCreateCampaign();
  const [form, setForm] = useState({
    name: "",
    target_audience: "",
    product: "",
    offer: "",
    tone: "Professionell och rak",
  });
  const [contextOpen, setContextOpen] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campaign = await createCampaign.mutateAsync(form);
      // Sequence is created automatically by DB trigger; look it up.
      const { data: seq, error: seqErr } = await supabase
        .from("sequences")
        .select("id")
        .eq("campaign_id", campaign.id)
        .maybeSingle();
      if (seqErr || !seq) {
        toast.error("Kampanj skapad men sekvens hittades inte");
        return;
      }
      toast.success("Kampanj skapad");
      onCreated({ campaignId: campaign.id, sequenceId: seq.id, name: campaign.name });
      setForm({ name: "", target_audience: "", product: "", offer: "", tone: "Professionell och rak" });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Kunde inte skapa kampanj");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Skapa ny kampanj</DialogTitle>
          <DialogDescription>
            En sekvens skapas automatiskt och dina valda leads importeras dit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cn-name">Namn</Label>
            <Input
              id="cn-name"
              placeholder="t.ex. Q1 2026 — VD:ar SaaS"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              autoFocus
            />
          </div>
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-left">
                <span>
                  <span className="text-sm font-medium">Kampanjkontext (valfritt)</span>
                  <span className="block text-xs text-muted-foreground">
                    Fyll i om du vill — vi frågar igen när du skriver sekvensen med AI.
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${contextOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="cn-audience">Målgrupp</Label>
                <Textarea
                  id="cn-audience"
                  placeholder="VD:ar på svenska SaaS-bolag, 10–50 anställda"
                  value={form.target_audience}
                  onChange={(e) => update("target_audience", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cn-product">Produkt</Label>
                  <Input
                    id="cn-product"
                    placeholder="Vad säljer du?"
                    value={form.product}
                    onChange={(e) => update("product", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cn-offer">Erbjudande</Label>
                  <Input
                    id="cn-offer"
                    placeholder="Demo, 14 dagars trial…"
                    value={form.offer}
                    onChange={(e) => update("offer", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cn-tone">Ton</Label>
                <Input
                  id="cn-tone"
                  value={form.tone}
                  onChange={(e) => update("tone", e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={createCampaign.isPending} className="gap-2">
              {createCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Skapa kampanj
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
