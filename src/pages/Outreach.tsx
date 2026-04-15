import Layout from "@/components/Layout";
import { useParams } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useOutreachForLead, useApproveOutreach } from "@/hooks/useOutreach";
import EmailCard from "@/components/EmailCard";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaign } from "@/hooks/useCampaigns";

const OutreachContent = ({ leadId, campaignId }: { leadId: string; campaignId: string }) => {
  const { data: outreach, isLoading } = useOutreachForLead(leadId);
  const approveOutreach = useApproveOutreach();
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: { campaign_id: campaignId, lead_id: leadId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Emails regenerated!");
      queryClient.invalidateQueries({ queryKey: ["outreach", leadId] });
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border p-5 space-y-3">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!outreach) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No emails generated for this lead yet.
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await approveOutreach.mutateAsync(outreach.id);
      toast.success("Outreach approved!");
    } catch {
      toast.error("Failed to approve");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {outreach.status === "pending" && (
          <Button onClick={handleApprove} disabled={approveOutreach.isPending} className="gap-1.5" size="sm">
            <Check className="h-4 w-4" /> Approve
          </Button>
        )}
        {outreach.status === "approved" && (
          <div className="rounded-lg bg-success/10 text-success px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" /> Approved
          </div>
        )}
      </div>
      <EmailCard
        title="Cold Email"
        content={outreach.cold_email || ""}
        subjectLine={outreach.subject_line || ""}
        onRegenerate={handleRegenerate}
        isRegenerating={regenerating}
      />
      <EmailCard title="Follow-up #1" content={outreach.follow_up_1 || ""} onRegenerate={handleRegenerate} isRegenerating={regenerating} />
      <EmailCard title="Follow-up #2" content={outreach.follow_up_2 || ""} onRegenerate={handleRegenerate} isRegenerating={regenerating} />
    </div>
  );
};

const Outreach = () => {
  const { id } = useParams();
  const { data: leads, isLoading } = useLeads(id);
  const { data: campaign } = useCampaign(id);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (leads && leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-10">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-8" />
          <div className="flex gap-6">
            <div className="w-56 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
            </div>
            <div className="flex-1 space-y-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Generated outreach</h1>
          <p className="text-sm text-muted-foreground">Review, copy, and refine your email sequences. {leads?.length || 0} leads.</p>
        </div>

        <div className="flex gap-6">
          <div className="w-56 flex-shrink-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Leads</p>
            {leads?.map((lead) => (
              <LeadButton key={lead.id} lead={lead} isSelected={selectedLeadId === lead.id} onClick={() => setSelectedLeadId(lead.id)} />
            ))}
          </div>

          <div className="flex-1">
            {selectedLeadId && id ? (
              <OutreachContent leadId={selectedLeadId} campaignId={id} />
            ) : (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                Select a lead to view their outreach.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const LeadButton = ({ lead, isSelected, onClick }: { lead: any; isSelected: boolean; onClick: () => void }) => {
  const { data: outreach } = useOutreachForLead(lead.id);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2">
        {outreach?.status === "approved" ? (
          <Check className="h-3 w-3 text-success flex-shrink-0" />
        ) : (
          <Circle className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">{lead.full_name}</div>
          <div className="text-xs truncate">{lead.company}</div>
        </div>
      </div>
    </button>
  );
};

export default Outreach;
