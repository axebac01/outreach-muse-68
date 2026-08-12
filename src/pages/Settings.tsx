import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useUsage } from "@/hooks/useUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, BarChart3, Pencil, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import IntegrationsCard from "@/components/IntegrationsCard";
import { SubscriptionSection } from "@/components/SubscriptionSection";
import { UpgradeSuccessCard } from "@/components/UpgradeSuccessCard";

const Settings = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { campaignCount, monthlyOutreach, limits } = useUsage();
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // --- Uppgraderingsbekräftelse efter Stripe-checkout ---
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { subscription, refetch } = useSubscription();
  const [upgradeState, setUpgradeState] = useState<"idle" | "pending" | "confirmed" | "timeout">(
    params.get("subscription") === "success" ? "pending" : "idle",
  );
  const cleared = useRef(false);

  // Rensa query-parametern så kortet inte kommer tillbaka vid reload
  useEffect(() => {
    if (params.get("subscription") === "success" && !cleared.current) {
      cleared.current = true;
      navigate("/settings", { replace: true });
    }
  }, [params, navigate]);

  // Polla tills webhooken hunnit skriva prenumerationen
  useEffect(() => {
    if (upgradeState !== "pending") return;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      const { data } = await refetch();
      const end = data?.current_period_end ? new Date(data.current_period_end).getTime() : null;
      const active =
        !!data &&
        ["active", "trialing", "past_due"].includes(data.status) &&
        (!end || end > Date.now());
      if (active) {
        queryClient.invalidateQueries({ queryKey: ["plan_limits"] });
        queryClient.invalidateQueries({ queryKey: ["credit-wallet"] });
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        setUpgradeState("confirmed");
        clearInterval(id);
      } else if (attempts >= 15) {
        setUpgradeState("timeout");
        clearInterval(id);
      }
    };
    const id = setInterval(tick, 2000);
    tick();
    return () => clearInterval(id);
  }, [upgradeState, refetch, queryClient]);


  const handleEditName = () => {
    setNameValue(profile?.full_name || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: nameValue });
      setEditingName(false);
      toast.success(t("settings.nameUpdated"));
    } catch {
      toast.error(t("settings.nameUpdateFailed"));
    }
  };

  const campaignPercent = limits.campaigns === Infinity ? 0 : Math.min((campaignCount / limits.campaigns) * 100, 100);
  const outreachPercent = limits.outreachPerMonth === Infinity ? 0 : Math.min((monthlyOutreach / limits.outreachPerMonth) * 100, 100);

  return (
    <Layout>
      <div className="container py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-10">{t("settings.title")}</h1>

        <div className="space-y-6">
          {upgradeState !== "idle" && (
            <UpgradeSuccessCard
              state={upgradeState}
              priceId={subscription?.price_id}
              onDismiss={() => setUpgradeState("idle")}
            />
          )}

          <div className="rounded-xl border bg-card p-6 space-y-4 card-hover">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{t("settings.profile")}</h2>
                <p className="text-sm text-muted-foreground">{t("settings.profileSub")}</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">{t("settings.name")}</span>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="h-8 w-48 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    />
                    <Button size="sm" className="h-8" onClick={handleSaveName} disabled={updateProfile.isPending}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{profile?.full_name || "—"}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleEditName}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t("settings.email")}</span>
                <span className="font-medium">{user?.email || "—"}</span>
              </div>
            </div>
          </div>

          <SubscriptionSection />

          <div className="rounded-xl border bg-card p-6 space-y-4 card-hover">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{t("settings.usage")}</h2>
                <p className="text-sm text-muted-foreground">{t("settings.usageSub")}</p>
              </div>
            </div>
            <div className="grid gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("settings.campaigns")}</span>
                  <span className="font-medium">
                    {campaignCount} / {limits.campaigns === Infinity ? "∞" : limits.campaigns}
                  </span>
                </div>
                {limits.campaigns !== Infinity && (
                  <Progress value={campaignPercent} className="h-2" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("settings.outreachMonth")}</span>
                  <span className="font-medium">
                    {monthlyOutreach} / {limits.outreachPerMonth === Infinity ? "∞" : limits.outreachPerMonth}
                  </span>
                </div>
                {limits.outreachPerMonth !== Infinity && (
                  <Progress value={outreachPercent} className="h-2" />
                )}
              </div>
            </div>
          </div>

          <IntegrationsCard />

        </div>
      </div>
    </Layout>
  );
};

export default Settings;
