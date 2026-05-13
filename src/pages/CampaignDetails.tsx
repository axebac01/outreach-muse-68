import { useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useCampaign, useCampaignSequence, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useSequenceLeads } from "@/hooks/useSequence";
import { OverviewTab } from "@/components/campaign/OverviewTab";
import { LeadsTab } from "@/components/campaign/LeadsTab";
import { SequenceTab } from "@/components/campaign/SequenceTab";
import { ScheduleTab } from "@/components/campaign/ScheduleTab";
import { SendersTab } from "@/components/campaign/SendersTab";

const TABS = ["overview", "leads", "sequence", "schedule", "senders"] as const;

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: campaign, isLoading } = useCampaign(id);
  const { data: sequence, isLoading: seqLoading } = useCampaignSequence(id);
  const { data: leads = [] } = useSequenceLeads(sequence?.id);
  const updateCampaign = useUpdateCampaign(id ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab = TABS.includes(tabParam as any) ? (tabParam as typeof TABS[number]) : "overview";
  const setTab = (t: string) => setSearchParams({ tab: t }, { replace: true });

  const [name, setName] = useState(campaign?.name ?? "");

  if (isLoading || seqLoading) {
    return (
      <Layout>
        <div className="container py-12">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!campaign || !sequence) {
    return (
      <Layout>
        <div className="container py-12 text-center text-muted-foreground">Kampanj hittades inte.</div>
      </Layout>
    );
  }

  const handleNameChange = (v: string) => {
    setName(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateCampaign.mutate({ name: v }), 500);
  };

  return (
    <Layout>
      <div className="border-b sticky top-20 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={name || campaign.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="text-lg font-semibold border-none shadow-none px-2 focus-visible:ring-1 max-w-md"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Översikt</TabsTrigger>
              <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
              <TabsTrigger value="sequence">Sekvens</TabsTrigger>
              <TabsTrigger value="schedule">Schema</TabsTrigger>
              <TabsTrigger value="senders">Avsändare & start</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsContent value="overview"><OverviewTab campaign={campaign} sequenceStatus={sequence.status} sequenceId={sequence.id} leadCount={leads.length} /></TabsContent>
          <TabsContent value="leads"><LeadsTab sequenceId={sequence.id} /></TabsContent>
          <TabsContent value="sequence"><SequenceTab sequenceId={sequence.id} /></TabsContent>
          <TabsContent value="schedule"><ScheduleTab sequence={sequence as any} /></TabsContent>
          <TabsContent value="senders"><SendersTab sequence={sequence as any} /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CampaignDetails;
