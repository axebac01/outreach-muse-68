import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { sampleCampaigns } from "@/data/sampleData";
import { Plus, ArrowRight } from "lucide-react";
import EmptyState from "@/components/EmptyState";

const Dashboard = () => {
  const campaigns = sampleCampaigns;

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your campaigns</h1>
            <p className="text-sm text-muted-foreground">Manage and track your outreach campaigns</p>
          </div>
          <Button asChild>
            <Link to="/campaign/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New campaign
            </Link>
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create your first campaign to start generating personalized outreach."
            actionLabel="Create campaign"
            actionHref="/campaign/new"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                to={`/campaign/${c.id}`}
                className="group rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "generated" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {c.status === "generated" ? "Generated" : "Draft"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{c.targetAudience}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{c.leads.length} leads</span>
                  <span>{c.createdAt}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
