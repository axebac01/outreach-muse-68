import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { useUsage } from "@/hooks/useUsage";
import UpgradeBanner from "@/components/UpgradeBanner";

const CreateCampaign = () => {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const { canCreateCampaign } = useUsage();
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
    if (!canCreateCampaign) {
      toast.error("You've reached your campaign limit. Upgrade to create more.");
      return;
    }
    try {
      const data = await createCampaign.mutateAsync(form);
      toast.success("Campaign created! Add leads to continue.");
      navigate(`/campaign/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
    }
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Step 1 of 2</p>
          <h1 className="text-3xl font-bold">Create a new campaign</h1>
          <p className="text-muted-foreground mt-1">Tell MailLead.ai who you want to reach and what you're offering.</p>
        </div>
        {!canCreateCampaign && (
          <div className="mb-6">
            <UpgradeBanner message="You've reached your free limit. Upgrade to keep generating outreach." />
          </div>
        )}
        <div className="rounded-xl border bg-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign name</Label>
              <Input id="name" placeholder="e.g., SaaS Founders Q2 Outreach" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target audience / ICP</Label>
              <Textarea id="audience" placeholder="e.g., B2B SaaS founders, Series A-B, 20-200 employees" value={form.target_audience} onChange={(e) => update("target_audience", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">What do you sell?</Label>
              <Input id="product" placeholder="e.g., AI-powered cold email tool" value={form.product} onChange={(e) => update("product", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer">Your offer</Label>
              <Input id="offer" placeholder="e.g., 14-day free trial + dedicated onboarding" value={form.offer} onChange={(e) => update("offer", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone of voice</Label>
              <Input id="tone" placeholder="e.g., Professional but friendly" value={form.tone} onChange={(e) => update("tone", e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="hero" className="flex-1" disabled={createCampaign.isPending || !canCreateCampaign}>
                {createCampaign.isPending ? "Creating..." : "Create campaign"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateCampaign;
