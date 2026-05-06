import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useTrackingSites = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tracking_sites_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking_sites", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["tracking_sites"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["tracking_sites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_sites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

function genSiteKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return "ml_" + Array.from(bytes).map((b) => b.toString(36)).join("").slice(0, 24);
}

export const useCreateTrackingSite = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { domain: string; name?: string; require_consent?: boolean }) => {
      const { data, error } = await supabase
        .from("tracking_sites")
        .insert({
          user_id: user!.id,
          domain: input.domain,
          name: input.name || null,
          require_consent: input.require_consent ?? false,
          site_key: genSiteKey(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking_sites"] }),
  });
};

export const useDeleteTrackingSite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tracking_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking_sites"] }),
  });
};

export const useInboundCompanies = (opts?: { knownOnly?: boolean }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbound_companies", user?.id, opts?.knownOnly],
    queryFn: async () => {
      let q = supabase
        .from("inbound_companies")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (opts?.knownOnly) q = q.eq("is_known_lead", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCompanyVisits = (companyId: string | undefined) => {
  return useQuery({
    queryKey: ["company_visits", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useInboundNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbound_notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_notifications")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useRecentVisits = (limit = 50) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("recent_visits_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visits", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["recent_visits"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["recent_visits", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
};

export const useIdentifiedVisitors = (limit = 50) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["identified_visitors", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitors")
        .select("id, visitor_id, lead_id, email, company_id, visit_count, last_seen_at, first_seen_at")
        .not("lead_id", "is", null)
        .order("last_seen_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const leadIds = Array.from(new Set((data || []).map((v: any) => v.lead_id).filter(Boolean)));
      let leadsMap: Record<string, any> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, full_name, email, company, role")
          .in("id", leadIds);
        leadsMap = Object.fromEntries((leads || []).map((l: any) => [l.id, l]));
      }
      return (data || []).map((v: any) => ({ ...v, lead: leadsMap[v.lead_id] || null }));
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
};

export const useInboundStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbound_stats", user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const sinceIso = since.toISOString();

      const [visitsRes, visitorsRes, companiesRes] = await Promise.all([
        supabase.from("visits").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
        supabase.from("visitors").select("id", { count: "exact", head: true }).gte("last_seen_at", sinceIso),
        supabase.from("inbound_companies").select("id", { count: "exact", head: true }).gte("last_seen_at", sinceIso),
      ]);

      return {
        visits: visitsRes.count || 0,
        visitors: visitorsRes.count || 0,
        companies: companiesRes.count || 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
};
