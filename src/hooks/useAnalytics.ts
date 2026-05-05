import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Range = "24h" | "7d" | "30d" | "all";

export const rangeStart = (r: Range): Date | null => {
  if (r === "all") return null;
  const d = new Date();
  if (r === "24h") d.setHours(d.getHours() - 24);
  if (r === "7d") d.setDate(d.getDate() - 7);
  if (r === "30d") d.setDate(d.getDate() - 30);
  return d;
};

export type AnalyticsData = {
  sends: { id: string; status: string; created_at: string; sequence_id: string; scheduled_for: string }[];
  leads: { id: string; status: string; created_at: string }[];
  sequences: { id: string; name: string; status: string }[];
  unsubscribes: { id: string; created_at: string }[];
};

export const useAnalytics = (range: Range) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics", user?.id, range],
    enabled: !!user,
    queryFn: async (): Promise<AnalyticsData> => {
      const start = rangeStart(range);
      const startIso = start ? start.toISOString() : null;

      const sendsQ = supabase
        .from("scheduled_sends")
        .select("id, status, created_at, sequence_id, scheduled_for")
        .eq("user_id", user!.id);
      if (startIso) sendsQ.gte("created_at", startIso);

      const leadsQ = supabase
        .from("sequence_leads")
        .select("id, status, created_at")
        .eq("user_id", user!.id);
      if (startIso) leadsQ.gte("created_at", startIso);

      const seqsQ = supabase
        .from("sequences")
        .select("id, name, status")
        .eq("user_id", user!.id);

      const unsubsQ = supabase
        .from("unsubscribes")
        .select("id, created_at")
        .eq("user_id", user!.id);
      if (startIso) unsubsQ.gte("created_at", startIso);

      const [sends, leads, sequences, unsubscribes] = await Promise.all([
        sendsQ,
        leadsQ,
        seqsQ,
        unsubsQ,
      ]);
      if (sends.error) throw sends.error;
      if (leads.error) throw leads.error;
      if (sequences.error) throw sequences.error;
      if (unsubscribes.error) throw unsubscribes.error;

      return {
        sends: (sends.data ?? []) as any,
        leads: (leads.data ?? []) as any,
        sequences: (sequences.data ?? []) as any,
        unsubscribes: (unsubscribes.data ?? []) as any,
      };
    },
  });
};
