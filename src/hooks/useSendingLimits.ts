import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { withSaveStatus } from "./useSaveStatus";

export interface SendingLimit {
  id: string;
  email_account_id: string;
  warmup_enabled: boolean;
  warmup_started_at: string;
  daily_cap_override: number | null;
}

export function useSendingLimits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sending_limits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_account_sending_limits")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as SendingLimit[];
    },
    enabled: !!user?.id,
  });
}

export function useSentToday() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sent_today", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("email_messages")
        .select("email_account_id")
        .eq("user_id", user!.id)
        .eq("direction", "outbound")
        .eq("status", "sent")
        .gte("sent_at", today.toISOString());
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.email_account_id] = (counts[r.email_account_id] || 0) + 1;
      return counts;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateSendingLimit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation(withSaveStatus({
    label: "Sändningsgränser",
    mutationFn: async (vars: { email_account_id: string; warmup_enabled?: boolean; daily_cap_override?: number | null }) => {
      const { email_account_id, ...rest } = vars;
      const { data: existing } = await supabase
        .from("email_account_sending_limits")
        .select("id").eq("email_account_id", email_account_id).maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("email_account_sending_limits")
          .update(rest).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_account_sending_limits")
          .insert({ email_account_id, user_id: user!.id, ...rest });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sending_limits"] }),
  }));
}

// Provider-specific safe daily sending caps based on each provider's published
// limits and well-known deliverability heuristics. These are conservative
// post-ramp-up ceilings; users with Workspace/Business tiers can raise the
// override manually.
//   - Gmail (free)         500/day  → we cap at 400 to leave room for replies
//   - Gmail (Workspace)   2000/day  → we don't know the tier, default to 400
//   - Outlook (personal)   300/day
//   - Outlook (M365 biz)  10000/day → default to 300 (safe)
//   - SMTP / unknown       100/day  (no provider trust signal)
export function providerCap(provider: string | null | undefined): number {
  switch ((provider || "").toLowerCase()) {
    case "gmail": return 400;
    case "outlook": return 300;
    case "smtp": return 100;
    default: return 100;
  }
}

export function effectiveCap(
  limit: SendingLimit | undefined,
  accountCreatedAt: string,
  provider?: string | null,
): { cap: number; rampUpDay: number | null; providerCeiling: number } {
  const ceiling = providerCap(provider);
  if (!limit || !limit.warmup_enabled) {
    const cap = Math.min(limit?.daily_cap_override ?? ceiling, ceiling);
    return { cap, rampUpDay: null, providerCeiling: ceiling };
  }
  const start = new Date(limit.warmup_started_at || accountCreatedAt).getTime();
  const day = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)) + 1;
  if (day >= 14) {
    const cap = Math.min(limit.daily_cap_override ?? ceiling, ceiling);
    return { cap, rampUpDay: null, providerCeiling: ceiling };
  }
  // Ramp 20 → ceiling over 14 days, never above ceiling.
  const rampCap = Math.min(20 + day * 5, ceiling);
  return { cap: rampCap, rampUpDay: day, providerCeiling: ceiling };
}
