import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCampaign } from "@/hooks/useCampaigns";
import { useLeads, useCreateLead } from "@/hooks/useLeads";
import { useUsage } from "@/hooks/useUsage";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import UpgradeBanner from "@/components/UpgradeBanner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: campaign, isLoading: campaignLoading } = useCampaign(id);
  const { data: leads, isLoading: leadsLoading } = useLeads(id);
  const createLead = useCreateLead();
  const { canAddLead, canGenerateOutreach } = useUsage();
  const [showAddRow, setShowAddRow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: "", company: "", role: "", website: "", linkedin_url: "", notes: "" });

  const handleAddLead = async () => {
    if (!newLead.full_name || !newLead.company) {
      toast.error("Name and company are required");
      return;
    }
    if (!canAddLead(leads?.length ?? 0)) {
      toast.error("Lead limit reached. Upgrade to add more.");
      return;
    }
    try {
      await createLead.mutateAsync({ ...newLead, campaign_id: id! });
      setNewLead({ full_name: "", company: "", role: "", website: "", linkedin_url: "", notes: "" });
      setShowAddRow(false);
      toast.success("Lead added!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add lead");
    }
  };

  const handleGenerate = async () => {
    if (!canGenerateOutreach) {
      toast.error("You've reached your free limit. Upgrade to keep generating outreach.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: { campaign_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Emails generated for ${data.count} leads!`);
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      navigate(`/outreach/${id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate emails");
    } finally {
      setGenerating(false);
    }
  };

  if (campaignLoading || leadsLoading) {
    return (
      <Layout>
        <div className="container py-10">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
            </div>
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <div className="container py-10 text-center text-muted-foreground">Campaign not found.</div>
      </Layout>
    );
  }

  const leadsList = leads || [];

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <div className="flex gap-2">
            {campaign.status === "generated" && (
              <Button variant="outline" asChild>
                <Link to={`/outreach/${campaign.id}`} className="gap-1.5">
                  View emails <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAddRow(true)} className="gap-1.5" disabled={!canAddLead(leadsList.length)}>
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
            <Button onClick={handleGenerate} className="gap-1.5" disabled={generating || leadsList.length === 0 || !canGenerateOutreach}>
              <Sparkles className="h-4 w-4" /> {generating ? "Generating..." : "Generate Emails"}
            </Button>
          </div>
        </div>

        {!canAddLead(leadsList.length) && (
          <div className="mb-4">
            <UpgradeBanner message="You've reached your lead limit. Upgrade to add more leads." />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Audience</p>
            <p className="font-medium">{campaign.target_audience || "—"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Product</p>
            <p className="font-medium">{campaign.product || "—"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Offer</p>
            <p className="font-medium">{campaign.offer || "—"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Tone</p>
            <p className="font-medium">{campaign.tone || "—"}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add leads ({leadsList.length})</h2>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Company</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Website</th>
                  <th className="text-left p-3 font-medium">LinkedIn</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {leadsList.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{lead.full_name}</td>
                    <td className="p-3">{lead.company}</td>
                    <td className="p-3">{lead.role}</td>
                    <td className="p-3 text-muted-foreground">{lead.website}</td>
                    <td className="p-3 text-muted-foreground">{lead.linkedin_url}</td>
                    <td className="p-3 text-muted-foreground">{lead.notes}</td>
                  </tr>
                ))}
                {showAddRow && (
                  <tr className="border-b bg-muted/20">
                    <td className="p-2"><Input placeholder="Full name" value={newLead.full_name} onChange={(e) => setNewLead({ ...newLead, full_name: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="Company" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="Role" value={newLead.role} onChange={(e) => setNewLead({ ...newLead, role: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="Website" value={newLead.website} onChange={(e) => setNewLead({ ...newLead, website: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="LinkedIn" value={newLead.linkedin_url} onChange={(e) => setNewLead({ ...newLead, linkedin_url: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2 flex gap-1">
                      <Input placeholder="Notes" value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} className="h-8 text-sm" />
                      <Button size="sm" className="h-8" onClick={handleAddLead} disabled={createLead.isPending}>Add</Button>
                    </td>
                  </tr>
                )}
                {leadsList.length === 0 && !showAddRow && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No leads yet. Click "Add Lead" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CampaignDetails;
