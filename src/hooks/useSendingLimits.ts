import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
  return useMutation({
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
  });
}

export function effectiveCap(limit: SendingLimit | undefined, accountCreatedAt: string, fallback = 25): { cap: number; warmupDay: number | null } {
  if (!limit || !limit.warmup_enabled) {
    return { cap: limit?.daily_cap_override ?? fallback, warmupDay: null };
  }
  const start = new Date(limit.warmup_started_at || accountCreatedAt).getTime();
  const day = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)) + 1;
  if (day >= 14) return { cap: limit.daily_cap_override ?? fallback, warmupDay: null };
  return { cap: Math.min(20 + day * 5, 50), warmupDay: day };
}
