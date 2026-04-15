import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useUsage } from "@/hooks/useUsage";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User, CreditCard, BarChart3 } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { plan, campaignCount, monthlyOutreach, limits } = useUsage();

  return (
    <Layout>
      <div className="container py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Profile</h2>
                <p className="text-sm text-muted-foreground">Your account details</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{profile?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email || "—"}</span>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Plan</h2>
                <p className="text-sm text-muted-foreground">Manage your subscription</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary capitalize">
                  {plan}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan === "starter" ? "Free plan with limited usage" : "Unlimited access to all features"}
                </p>
              </div>
              {plan === "starter" && (
                <Button asChild size="sm">
                  <Link to="/pricing">Upgrade</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Usage */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Usage</h2>
                <p className="text-sm text-muted-foreground">Your current usage this month</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Campaigns</span>
                <span className="font-medium">
                  {campaignCount} / {limits.campaigns === Infinity ? "∞" : limits.campaigns}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Outreach generated (this month)</span>
                <span className="font-medium">
                  {monthlyOutreach} / {limits.outreachPerMonth === Infinity ? "∞" : limits.outreachPerMonth}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
