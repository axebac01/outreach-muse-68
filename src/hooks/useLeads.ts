import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useLeads = (campaignId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["leads", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("campaign_id", campaignId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!campaignId,
  });
};

export const useCreateLead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: {
      campaign_id: string;
      full_name: string;
      company: string;
      role?: string;
      website?: string;
      linkedin_url?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads", data.campaign_id] });
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaign_id }: { id: string; campaign_id: string }) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      return { campaign_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads", data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
};
