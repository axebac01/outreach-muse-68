import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useTrackingSites = () => {
  const { user } = useAuth();
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
