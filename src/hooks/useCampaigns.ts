import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useCampaigns = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, leads(count)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCampaign = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateCampaign = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: {
      name: string;
      target_audience: string;
      product: string;
      offer: string;
      tone: string;
    }) => {
      // Track usage
      await supabase.from("usage_tracking").insert({
        user_id: user!.id,
        action: "campaign_created",
      });

      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...campaign, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
  });
};
