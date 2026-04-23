import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCampaign } from "@/hooks/useCampaigns";
import { useLeads, useCreateLead, useDeleteLead } from "@/hooks/useLeads";
import { useUsage } from "@/hooks/useUsage";
import { ArrowRight, Plus, Sparkles, Trash2, Target, Package, Gift, MessageSquare, Upload } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import UpgradeBanner from "@/components/UpgradeBanner";
import ImportLeadsDialog from "@/components/ImportLeadsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: campaign, isLoading: campaignLoading } = useCampaign(id);
  const { data: leads, isLoading: leadsLoading } = useLeads(id);
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();
  const { canAddLead, canGenerateOutreach, limits } = useUsage();
  const [showAddRow, setShowAddRow] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: "", email: "", company: "", role: "", website: "", linkedin_url: "", notes: "" });

  const infoCards = [
    { key: "target_audience", label: t("campaign.audience"), icon: Target },
    { key: "product", label: t("campaign.product"), icon: Package },
    { key: "offer", label: t("campaign.offer"), icon: Gift },
    { key: "tone", label: t("campaign.tone"), icon: MessageSquare },
  ] as const;

  const handleAddLead = async () => {
    if (!newLead.full_name || !newLead.company) {
      toast.error(t("campaign.nameCompanyReq"));
      return;
    }
    if (!canAddLead(leads?.length ?? 0)) {
      toast.error(t("campaign.leadLimitReached"));
      return;
    }
    try {
      await createLead.mutateAsync({ ...newLead, campaign_id: id! });
      setNewLead({ full_name: "", email: "", company: "", role: "", website: "", linkedin_url: "", notes: "" });
      setShowAddRow(false);
      toast.success(t("campaign.leadAdded"));
    } catch (error: any) {
      toast.error(error.message || t("campaign.addLeadFailed"));
    }
  };

  const handleGenerate = async () => {
    if (!canGenerateOutreach) {
      toast.error(t("campaign.outreachLimit"));
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: { campaign_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t("campaign.emailsGenerated", { count: data.count }));
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      navigate(`/outreach/${id}`);
    } catch (error: any) {
      toast.error(error.message || t("campaign.generateFailed"));
    } finally {
      setGenerating(false);
    }
  };

  if (campaignLoading || leadsLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="space-y-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
            </div>
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <div className="container py-12 text-center text-muted-foreground">{t("campaign.notFound")}</div>
      </Layout>
    );
  }

  const leadsList = leads || [];

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <div className="flex gap-2">
            {campaign.status === "generated" && (
              <Button variant="outline" asChild>
                <Link to={`/outreach/${campaign.id}`} className="gap-1.5">
                  {t("campaign.viewEmails")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5" disabled={!canAddLead(leadsList.length)}>
              <Upload className="h-4 w-4" /> {t("campaign.importFile")}
            </Button>
            <Button variant="outline" onClick={() => setShowAddRow(true)} className="gap-1.5" disabled={!canAddLead(leadsList.length)}>
              <Plus className="h-4 w-4" /> {t("campaign.addLead")}
            </Button>
            <Button variant="hero" onClick={handleGenerate} className="gap-1.5" disabled={generating || leadsList.length === 0 || !canGenerateOutreach}>
              <Sparkles className="h-4 w-4" /> {generating ? t("campaign.generating") : t("campaign.generate")}
            </Button>
          </div>
        </div>

        {!canAddLead(leadsList.length) && (
          <div className="mb-6">
            <UpgradeBanner message={t("campaign.leadLimit")} />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {infoCards.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-muted-foreground text-xs font-medium">{label}</p>
              </div>
              <p className="font-medium text-sm">{(campaign as any)[key] || "—"}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <h2 className="text-base font-semibold">{t("campaign.leads")} ({leadsList.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">{t("campaign.name")}</th>
                  <th className="text-left p-3 font-medium">{t("campaign.email")}</th>
                  <th className="text-left p-3 font-medium">{t("campaign.company")}</th>
                  <th className="text-left p-3 font-medium">{t("campaign.role")}</th>
                  <th className="text-left p-3 font-medium">{t("campaign.website")}</th>
                  <th className="text-left p-3 font-medium">{t("campaign.linkedin")}</th>
                  <th className="text-left p-3 font-medium">{t("campaign.notes")}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {leadsList.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{lead.full_name}</td>
                    <td className="p-3 text-muted-foreground">{(lead as any).email || "—"}</td>
                    <td className="p-3">{lead.company}</td>
                    <td className="p-3">{lead.role}</td>
                    <td className="p-3 text-muted-foreground">{lead.website}</td>
                    <td className="p-3 text-muted-foreground">{lead.linkedin_url}</td>
                    <td className="p-3 text-muted-foreground">{lead.notes}</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          deleteLead.mutate({ id: lead.id, campaign_id: id! });
                          toast.success(t("campaign.leadRemoved"));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {showAddRow && (
                  <tr className="border-b bg-muted/20">
                    <td className="p-2"><Input placeholder={t("campaign.name")} value={newLead.full_name} onChange={(e) => setNewLead({ ...newLead, full_name: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder={t("campaign.email")} value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder={t("campaign.company")} value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder={t("campaign.role")} value={newLead.role} onChange={(e) => setNewLead({ ...newLead, role: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder={t("campaign.website")} value={newLead.website} onChange={(e) => setNewLead({ ...newLead, website: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder={t("campaign.linkedin")} value={newLead.linkedin_url} onChange={(e) => setNewLead({ ...newLead, linkedin_url: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2"><Input placeholder={t("campaign.notes")} value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" className="h-8" onClick={handleAddLead} disabled={createLead.isPending}>{t("campaign.addBtn")}</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAddRow(false)}>{t("common.cancel")}</Button>
                      </div>
                    </td>
                  </tr>
                )}
                {leadsList.length === 0 && !showAddRow && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {t("campaign.noLeads")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ImportLeadsDialog
        open={showImport}
        onOpenChange={setShowImport}
        campaignId={id!}
        currentLeadCount={leadsList.length}
        maxLeads={limits.leadsPerCampaign}
      />
    </Layout>
  );
};

export default CampaignDetails;
