import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import { useAnalytics, type Range } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Send, Reply, AlertTriangle, UserMinus, Activity, Clock, Users } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const RANGES: Range[] = ["24h", "7d", "30d", "all"];

const fmtDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "destructive" | "muted";
}) => {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
};

const Analytics = () => {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("7d");
  const { data, isLoading } = useAnalytics(range);

  const stats = useMemo(() => {
    if (!data) return null;
    const sent = data.sends.filter((s) => s.status === "sent").length;
    const failed = data.sends.filter((s) => ["failed", "bounced", "error"].includes(s.status)).length;
    const pendingFuture = data.sends.filter(
      (s) => s.status === "scheduled" && new Date(s.scheduled_for) > new Date()
    ).length;
    const replied = data.leads.filter((l) => l.status === "replied").length;
    const replyRate = sent > 0 ? (replied / sent) * 100 : 0;
    const activeSeq = data.sequences.filter((s) => s.status === "active").length;
    return {
      sent,
      failed,
      pendingFuture,
      replied,
      replyRate,
      activeSeq,
      totalSeq: data.sequences.length,
      totalLeads: data.leads.length,
      unsub: data.unsubscribes.length,
    };
  }, [data]);

  const series = useMemo(() => {
    if (!data) return [];
    const days = range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 30;
    const buckets = new Map<string, { day: string; sent: number; replies: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      buckets.set(fmtDay(d), { day: fmtDay(d).slice(5), sent: 0, replies: 0 });
    }
    data.sends
      .filter((s) => s.status === "sent")
      .forEach((s) => {
        const k = fmtDay(new Date(s.created_at));
        const b = buckets.get(k);
        if (b) b.sent++;
      });
    data.leads
      .filter((l) => l.status === "replied")
      .forEach((l) => {
        const k = fmtDay(new Date(l.created_at));
        const b = buckets.get(k);
        if (b) b.replies++;
      });
    return Array.from(buckets.values());
  }, [data, range]);

  const topCampaigns = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.sends
      .filter((s) => s.status === "sent")
      .forEach((s) => counts.set(s.sequence_id, (counts.get(s.sequence_id) ?? 0) + 1));
    const named = Array.from(counts.entries())
      .map(([id, n]) => ({
        name: data.sequences.find((s) => s.id === id)?.name ?? "—",
        sent: n,
      }))
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 5);
    return named;
  }, [data]);

  const hasAnyData = (data?.sends.length ?? 0) + (data?.leads.length ?? 0) > 0;

  return (
    <Layout>
      <div className="container py-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("analytics.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("analytics.subtitle")}</p>
          </div>
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "ghost"}
                className="h-8 px-3 text-xs"
                onClick={() => setRange(r)}
              >
                {t(`analytics.range.${r}`)}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : !hasAnyData ? (
          <EmptyState
            title={t("analytics.emptyTitle")}
            description={t("analytics.emptyDesc")}
            actionLabel={t("analytics.emptyAction")}
            actionHref="/dashboard"
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Send}
                label={t("analytics.sent")}
                value={stats!.sent.toLocaleString()}
                tone="primary"
              />
              <StatCard
                icon={Reply}
                label={t("analytics.replies")}
                value={stats!.replied.toLocaleString()}
                hint={`${stats!.replyRate.toFixed(1)}% ${t("analytics.replyRate")}`}
                tone="success"
              />
              <StatCard
                icon={AlertTriangle}
                label={t("analytics.failed")}
                value={stats!.failed.toLocaleString()}
                tone="destructive"
              />
              <StatCard
                icon={UserMinus}
                label={t("analytics.unsubscribes")}
                value={stats!.unsub.toLocaleString()}
                tone="muted"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon={Activity}
                label={t("analytics.activeSeq")}
                value={`${stats!.activeSeq} / ${stats!.totalSeq}`}
                tone="primary"
              />
              <StatCard
                icon={Clock}
                label={t("analytics.upcoming")}
                value={stats!.pendingFuture.toLocaleString()}
                tone="muted"
              />
              <StatCard
                icon={Users}
                label={t("analytics.totalLeads")}
                value={stats!.totalLeads.toLocaleString()}
                tone="muted"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">{t("analytics.activityTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sent"
                        stroke="hsl(var(--primary))"
                        fill="url(#sentGrad)"
                        name={t("analytics.sent")}
                      />
                      <Area
                        type="monotone"
                        dataKey="replies"
                        stroke="hsl(var(--success))"
                        fill="url(#repGrad)"
                        name={t("analytics.replies")}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("analytics.topCampaigns")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {topCampaigns.length === 0 ? (
                    <div className="h-full grid place-items-center text-sm text-muted-foreground">
                      {t("analytics.noCampaignData")}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topCampaigns} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="sent" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
