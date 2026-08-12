import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { usePlanLimits, type PlanKey } from "./usePlanLimits";

// Månatlig outreach-volym per plan (dagligt tak per konto × ~22 arbetsdagar).
// Free är den enda planen med ett hårt tak i UI:t.
const OUTREACH_PER_MONTH: Record<PlanKey, number> = {
  free: 100,
  starter: Infinity,
  growth: Infinity,
  scale: Infinity,
};

const LEADS_PER_CAMPAIGN: Record<PlanKey, number> = {
  free: 25,
  starter: 2000,
  growth: 10000,
  scale: Infinity,
};

export const useUsage = () => {
  const { user } = useAuth();
  const { limits: planLimits, isLoading: limitsLoading } = usePlanLimits();

  const plan: PlanKey = planLimits?.plan ?? "free";

  const limits = {
    campaigns: planLimits && planLimits.campaigns < 0 ? Infinity : (planLimits?.campaigns ?? 1),
    leadsPerCampaign: LEADS_PER_CAMPAIGN[plan],
    outreachPerMonth: OUTREACH_PER_MONTH[plan],
  };

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

  const campaignCount = campaignCountQuery.data ?? 0;
  const monthlyOutreach = monthlyOutreachQuery.data ?? 0;

  return {
    plan,
    limits,
    isLoading: limitsLoading,
    campaignCount,
    monthlyOutreach,
    // Optimistisk innan plangränserna hunnit laddas — annars blockeras
    // betalande användare felaktigt en kort stund.
    canCreateCampaign: limitsLoading || campaignCount < limits.campaigns,
    canGenerateOutreach: monthlyOutreach < limits.outreachPerMonth,
    canAddLead: (count: number) => count < limits.leadsPerCampaign,
  };
};
