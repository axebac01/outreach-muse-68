import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type PlanKey = "free" | "starter" | "growth" | "scale";

export interface PlanLimits {
  plan: PlanKey;
  email_accounts: number; // -1 = obegränsat
  campaigns: number;
  daily_sends_per_account: number;
  inbox_ai: boolean;
}

const RESOURCES = ["email_accounts", "campaigns", "daily_sends_per_account", "inbox_ai"] as const;

export function usePlanLimits() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["plan_limits", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlanLimits> => {
      const [planRes, ...limits] = await Promise.all([
        supabase.rpc("get_user_plan", { user_uuid: userId! }),
        ...RESOURCES.map((r) =>
          supabase.rpc("get_plan_limit", { user_uuid: userId!, resource: r }),
        ),
      ]);
      const plan = (planRes.data as PlanKey | null) ?? "free";
      const [emailAccounts, campaigns, daily, ai] = limits.map((r) => Number(r.data ?? 0));
      return {
        plan,
        email_accounts: emailAccounts,
        campaigns,
        daily_sends_per_account: daily,
        inbox_ai: ai > 0,
      };
    },
  });

  // Re-fetch när subscriptions ändras (uppgradering/nedgradering)
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`plan_limits:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => query.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, query]);

  return {
    limits: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Returnerar true om användaren får skapa fler av `resource`.
 * `currentCount` = nuvarande antal i DB.
 */
export function canCreateMore(
  limits: PlanLimits | null,
  resource: "email_accounts" | "campaigns",
  currentCount: number,
): boolean {
  if (!limits) return true; // optimistisk innan vi vet
  const cap = limits[resource];
  if (cap < 0) return true;
  return currentCount < cap;
}
