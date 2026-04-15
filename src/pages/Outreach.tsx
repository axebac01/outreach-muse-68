import Layout from "@/components/Layout";
import { useParams } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useOutreachForLead, useApproveOutreach } from "@/hooks/useOutreach";
import EmailCard from "@/components/EmailCard";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

const OutreachContent = ({ leadId }: { leadId: string }) => {
  const { data: outreach, isLoading } = useOutreachForLead(leadId);
  const approveOutreach = useApproveOutreach();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
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
      {outreach.status === "pending" && (
        <div className="flex justify-end">
          <Button onClick={handleApprove} disabled={approveOutreach.isPending} className="gap-1.5" size="sm">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      )}
      {outreach.status === "approved" && (
        <div className="rounded-lg bg-success/10 text-success px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
          <Check className="h-4 w-4" /> Approved
        </div>
      )}
      <EmailCard title="Cold Email" content={outreach.cold_email || ""} subjectLine={outreach.subject_line || ""} />
      <EmailCard title="Follow-up #1" content={outreach.follow_up_1 || ""} />
      <EmailCard title="Follow-up #2" content={outreach.follow_up_2 || ""} />
    </div>
  );
};

const Outreach = () => {
  const { id } = useParams();
  const { data: leads, isLoading } = useLeads(id);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (leads && leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
              <button
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedLeadId === lead.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="font-medium text-foreground">{lead.full_name}</div>
                <div className="text-xs">{lead.company}</div>
              </button>
            ))}
          </div>

          <div className="flex-1">
            {selectedLeadId ? (
              <OutreachContent leadId={selectedLeadId} />
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

export default Outreach;
