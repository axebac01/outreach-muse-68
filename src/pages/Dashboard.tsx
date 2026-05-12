import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useUsage } from "@/hooks/useUsage";
import { Plus, ArrowRight } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import UpgradeBanner from "@/components/UpgradeBanner";
import { useTranslation } from "react-i18next";

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  active: "Aktiv",
  paused: "Pausad",
  completed: "Slutförd",
};

const Dashboard = () => {
  const { data: campaigns, isLoading } = useCampaigns();
  const { canCreateCampaign } = useUsage();
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
          </div>
          {canCreateCampaign ? (
            <Button asChild>
              <Link to="/campaign/new" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("dashboard.newBtn")}
              </Link>
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <Plus className="h-4 w-4" />
              {t("dashboard.newBtn")}
            </Button>
          )}
        </div>

        {!canCreateCampaign && (
          <div className="mb-6">
            <UpgradeBanner message={t("dashboard.upgradeUsed")} />
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
                <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <EmptyState
            title={t("dashboard.emptyTitle")}
            description={t("dashboard.emptyDesc")}
            actionLabel={t("dashboard.emptyAction")}
            actionHref="/campaign/new"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c: any) => (
              <Link
                key={c.id}
                to={`/campaign/${c.id}`}
                className="group rounded-xl border bg-card p-6 space-y-3 card-hover hover:border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.sequence_status === "active" ? "bg-success/10 text-success" :
                    c.sequence_status === "paused" ? "bg-muted text-muted-foreground" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {STATUS_LABEL[c.sequence_status] ?? c.sequence_status}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{c.target_audience || "—"}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{c.lead_count ?? 0} leads</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
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
