import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    targetAudience: "",
    product: "",
    offer: "",
    tone: "",
  });

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Campaign created! Add leads to continue.");
    navigate("/campaign/1");
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Create a new campaign</h1>
          <p className="text-sm text-muted-foreground">Tell SignalFlow who you want to reach and what you're offering.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" placeholder="e.g., SaaS Founders Q2 Outreach" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">Target audience / ICP</Label>
            <Textarea id="audience" placeholder="e.g., B2B SaaS founders, Series A-B, 20-200 employees" value={form.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} required />
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
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Create campaign</Button>
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateCampaign;
