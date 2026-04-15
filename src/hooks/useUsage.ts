import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "./useProfile";

const LIMITS = {
  starter: { campaigns: 1, leadsPerCampaign: 10, outreachPerMonth: 10 },
  growth: { campaigns: Infinity, leadsPerCampaign: Infinity, outreachPerMonth: Infinity },
};

export const useUsage = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const plan = (profile?.plan as "starter" | "growth") || "starter";
  const limits = LIMITS[plan];

  const campaignCountQuery = useQuery({
    queryKey: ["usage", "campaigns", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const monthlyOutreachQuery = useQuery({
    queryKey: ["usage", "outreach", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("usage_tracking")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("action", "outreach_generated")
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  return {
    plan,
    limits,
    campaignCount: campaignCountQuery.data ?? 0,
    monthlyOutreach: monthlyOutreachQuery.data ?? 0,
    canCreateCampaign: (campaignCountQuery.data ?? 0) < limits.campaigns,
    canGenerateOutreach: (monthlyOutreachQuery.data ?? 0) < limits.outreachPerMonth,
    canAddLead: (count: number) => count < limits.leadsPerCampaign,
  };
};
