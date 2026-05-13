import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, Package, Gift, MessageSquare, Send, Clock, AlertTriangle, MessageCircle } from "lucide-react";
import { useUpdateCampaign, useCampaignSequence } from "@/hooks/useCampaigns";
import { useSequenceSendStats } from "@/hooks/useSequence";
import { useRef } from "react";

interface Props {
  campaign: any;
  sequenceStatus: string;
  sequenceId: string;
  leadCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  active: "Aktiv",
  paused: "Pausad",
  completed: "Slutförd",
};

export const OverviewTab = ({ campaign, sequenceStatus, sequenceId, leadCount }: Props) => {
  const update = useUpdateCampaign(campaign.id);
  const { data: stats } = useSequenceSendStats(sequenceId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueSave = (patch: Record<string, any>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update.mutate(patch), 500);
  };

  const s = stats?.summary ?? { sent: 0, scheduled: 0, failed: 0, replied: 0 };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Översikt</h2>
        <Badge variant={sequenceStatus === "active" ? "default" : "secondary"}>
          {STATUS_LABEL[sequenceStatus] ?? sequenceStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Skickade mejl</div>
          <div className="text-2xl font-semibold">{s.sent}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Schemalagda</div>
          <div className="text-2xl font-semibold">{s.scheduled}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Misslyckade</div>
          <div className="text-2xl font-semibold">{s.failed}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Svar</div>
          <div className="text-2xl font-semibold">{s.replied}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Leads</div>
          <div className="text-sm font-medium pt-1">{leadCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Skapad</div>
          <div className="text-sm font-medium pt-1">{new Date(campaign.created_at).toLocaleDateString()}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="text-sm font-medium pt-1">{STATUS_LABEL[sequenceStatus] ?? sequenceStatus}</div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Kontext</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Målgrupp</Label>
            <Textarea defaultValue={campaign.target_audience ?? ""} onChange={(e) => queueSave({ target_audience: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Produkt</Label>
              <Input defaultValue={campaign.product ?? ""} onChange={(e) => queueSave({ product: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Erbjudande</Label>
              <Input defaultValue={campaign.offer ?? ""} onChange={(e) => queueSave({ offer: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Tonalitet</Label>
            <Input defaultValue={campaign.tone ?? ""} onChange={(e) => queueSave({ tone: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
