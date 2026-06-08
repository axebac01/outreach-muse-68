import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { usePlanLimits, canCreateMore } from "@/hooks/usePlanLimits";
import { PlanLimitBanner } from "@/components/PlanLimitBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

const CreateCampaign = () => {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const { user } = useAuth();
  const { limits } = usePlanLimits();
  const { t } = useTranslation();

  const { data: campaignCount = 0 } = useQuery({
    queryKey: ["campaign_count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const canCreate = canCreateMore(limits, "campaigns", campaignCount);

  const [form, setForm] = useState({
    name: "",
    target_audience: "",
    product: "",
    offer: "",
    tone: "",
  });

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      toast.error(t("createCampaign.limitReached"));
      return;
    }
    try {
      const data = await createCampaign.mutateAsync(form);
      toast.success(t("createCampaign.created"));
      navigate(`/campaign/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || t("createCampaign.createFailed"));
    }
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-2 font-medium">{t("createCampaign.step")}</p>
          <h1 className="text-3xl font-bold">{t("createCampaign.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("createCampaign.subtitle")}</p>
        </div>
        {!canCreate && limits && (
          <div className="mb-6">
            <PlanLimitBanner resource="campaigns" currentPlan={limits.plan} />
          </div>
        )}

        <div className="rounded-xl border bg-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("createCampaign.name")}</Label>
              <Input id="name" placeholder={t("createCampaign.namePh")} value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">{t("createCampaign.audience")}</Label>
              <Textarea id="audience" placeholder={t("createCampaign.audiencePh")} value={form.target_audience} onChange={(e) => update("target_audience", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">{t("createCampaign.product")}</Label>
              <Input id="product" placeholder={t("createCampaign.productPh")} value={form.product} onChange={(e) => update("product", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer">{t("createCampaign.offer")}</Label>
              <Input id="offer" placeholder={t("createCampaign.offerPh")} value={form.offer} onChange={(e) => update("offer", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">{t("createCampaign.tone")}</Label>
              <Input id="tone" placeholder={t("createCampaign.tonePh")} value={form.tone} onChange={(e) => update("tone", e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="hero" className="flex-1" disabled={createCampaign.isPending || !canCreate}>
                {createCampaign.isPending ? t("createCampaign.creating") : t("createCampaign.createBtn")}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>{t("common.cancel")}</Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateCampaign;
