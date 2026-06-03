import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Plus, Check, Loader2, ChevronDown } from "lucide-react";
import CreateCampaignInlineDialog from "./CreateCampaignInlineDialog";

interface Sequence {
  id: string;
  name: string;
  campaign_id?: string | null;
}

interface Props {
  marketplaceLeadId: string;
  sequences: Sequence[];
  imported?: { sequenceId: string; campaignId?: string | null; name: string } | null;
  onImported: (info: { sequenceId: string; campaignId?: string | null; name: string }) => void;
}

export default function ImportLeadToCampaignButton({
  marketplaceLeadId,
  sequences,
  imported,
  onImported,
}: Props) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (seq: Sequence) => {
      const { data, error } = await supabase.functions.invoke("leads-import", {
        body: { sequence_id: seq.id, marketplace_lead_ids: [marketplaceLeadId] },
      });
      if (error) throw error;
      return { seq, data };
    },
    onSuccess: ({ seq }) => {
      onImported({ sequenceId: seq.id, campaignId: seq.campaign_id, name: seq.name });
      toast.success(`Importerad till ${seq.name}`, {
        action: seq.campaign_id
          ? { label: "Visa kampanj", onClick: () => navigate(`/campaign/${seq.campaign_id}`) }
          : undefined,
      });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Kunde inte importera lead");
    },
  });

  const handleCreated = async ({
    sequenceId,
    campaignId,
    name,
  }: {
    sequenceId: string;
    campaignId: string;
    name: string;
  }) => {
    await importMutation.mutateAsync({ id: sequenceId, name, campaign_id: campaignId });
  };

  if (imported) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-emerald-500/40 text-emerald-700 hover:text-emerald-700"
          onClick={() =>
            imported.campaignId && navigate(`/campaign/${imported.campaignId}`)
          }
        >
          <Check className="h-3.5 w-3.5" />
          Importerad
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-1.5">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs">Importera till annan kampanj</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sequences.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => importMutation.mutate(s)}
                disabled={s.id === imported.sequenceId}
              >
                {s.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-2" /> Skapa ny kampanj…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateCampaignInlineDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={handleCreated}
        />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-7 gap-1.5" disabled={importMutation.isPending}>
            {importMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Importera till kampanj
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs">Välj kampanj</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sequences.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Inga kampanjer ännu</div>
          )}
          {sequences.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => importMutation.mutate(s)}>
              {s.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-2" /> Skapa ny kampanj…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateCampaignInlineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
