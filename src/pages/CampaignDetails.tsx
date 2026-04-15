import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { sampleCampaigns, sampleLeads } from "@/data/sampleData";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Lead } from "@/types";

const CampaignDetails = () => {
  const { id } = useParams();
  const campaign = sampleCampaigns.find((c) => c.id === id) || sampleCampaigns[0];
  const [leads, setLeads] = useState<Lead[]>(campaign.leads);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newLead, setNewLead] = useState({ fullName: "", company: "", role: "", website: "", linkedinUrl: "", notes: "" });

  const handleAddLead = () => {
    if (!newLead.fullName || !newLead.company) {
      toast.error("Name and company are required");
      return;
    }
    setLeads((prev) => [...prev, { ...newLead, id: String(Date.now()) }]);
    setNewLead({ fullName: "", company: "", role: "", website: "", linkedinUrl: "", notes: "" });
    setShowAddRow(false);
    toast.success("Lead added!");
  };

  const handleGenerate = () => {
    toast.success("Emails generated for all leads!");
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddRow(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
            <Button onClick={handleGenerate} className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Generate Emails
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Audience</p>
            <p className="font-medium">{campaign.targetAudience}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Product</p>
            <p className="font-medium">{campaign.product}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Offer</p>
            <p className="font-medium">{campaign.offer}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs mb-1">Tone</p>
            <p className="font-medium">{campaign.tone}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add leads ({leads.length})</h2>
          {campaign.status === "generated" && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/outreach/${campaign.id}`} className="gap-1.5">
                View generated emails <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
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
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{lead.fullName}</td>
                    <td className="p-3">{lead.company}</td>
                    <td className="p-3">{lead.role}</td>
                    <td className="p-3 text-muted-foreground">{lead.website}</td>
                    <td className="p-3 text-muted-foreground">{lead.linkedinUrl}</td>
                    <td className="p-3 text-muted-foreground">{lead.notes}</td>
                  </tr>
                ))}
                {showAddRow && (
                  <tr className="border-b bg-muted/20">
                    <td className="p-2"><Input placeholder="Full name" value={newLead.fullName} onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="Company" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="Role" value={newLead.role} onChange={(e) => setNewLead({ ...newLead, role: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="Website" value={newLead.website} onChange={(e) => setNewLead({ ...newLead, website: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder="LinkedIn" value={newLead.linkedinUrl} onChange={(e) => setNewLead({ ...newLead, linkedinUrl: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2 flex gap-1">
                      <Input placeholder="Notes" value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} className="h-8 text-sm" />
                      <Button size="sm" className="h-8" onClick={handleAddLead}>Add</Button>
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
