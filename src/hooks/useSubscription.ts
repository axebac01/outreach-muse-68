import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export interface SubscriptionRow {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

function computeIsActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const future = !end || end.getTime() > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status) && future) return true;
  if (sub.status === "canceled" && end && end.getTime() > Date.now()) return true;
  return false;
}

export function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id;
  const env = isPaymentsConfigured() ? getStripeEnvironment() : null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscription", userId, env],
    enabled: !!userId && !!env,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .eq("environment", env!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as SubscriptionRow | null) ?? null;
    },
  });

  useEffect(() => {
    if (!userId || !env) return;
    const channel = supabase
      .channel(`subscriptions:${userId}:${env}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["subscription", userId, env] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, env, queryClient]);

  return {
    subscription: query.data ?? null,
    isActive: computeIsActive(query.data ?? null),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
