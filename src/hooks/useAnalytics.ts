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
  totalLeads: number;
};

const PAGE = 1000;

/** API:t returnerar max 1000 rader per anrop — hämta i block tills allt är med. */
async function fetchAllRows<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export const useAnalytics = (range: Range) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics", user?.id, range],
    enabled: !!user,
    queryFn: async (): Promise<AnalyticsData> => {
      const start = rangeStart(range);
      const startIso = start ? start.toISOString() : null;

      const [sends, leads, sequences, unsubscribes, leadCount] = await Promise.all([
        fetchAllRows<AnalyticsData["sends"][number]>((from, to) => {
          const q = supabase
            .from("scheduled_sends")
            .select("id, status, created_at, sequence_id, scheduled_for")
            .eq("user_id", user!.id);
          if (startIso) q.gte("created_at", startIso);
          return q.order("created_at", { ascending: true }).range(from, to);
        }),
        fetchAllRows<AnalyticsData["leads"][number]>((from, to) => {
          const q = supabase
            .from("sequence_leads")
            .select("id, status, created_at")
            .eq("user_id", user!.id);
          if (startIso) q.gte("created_at", startIso);
          return q.order("created_at", { ascending: true }).range(from, to);
        }),
        fetchAllRows<AnalyticsData["sequences"][number]>((from, to) =>
          supabase
            .from("sequences")
            .select("id, name, status")
            .eq("user_id", user!.id)
            .range(from, to),
        ),
        fetchAllRows<AnalyticsData["unsubscribes"][number]>((from, to) => {
          const q = supabase.from("unsubscribes").select("id, created_at").eq("user_id", user!.id);
          if (startIso) q.gte("created_at", startIso);
          return q.order("created_at", { ascending: true }).range(from, to);
        }),
        (async () => {
          const q = supabase
            .from("sequence_leads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id);
          if (startIso) q.gte("created_at", startIso);
          const { count, error } = await q;
          if (error) throw error;
          return count ?? 0;
        })(),
      ]);

      return { sends, leads, sequences, unsubscribes, totalLeads: leadCount };
    },
  });
};
