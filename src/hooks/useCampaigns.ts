import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withSaveStatus } from "./useSaveStatus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useCampaigns = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      // Fetch campaigns with linked sequence + lead count
      const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (campaigns ?? []).map((c) => c.id);
      if (ids.length === 0) return [];

      const { data: seqs } = await supabase
        .from("sequences")
        .select("id, campaign_id, status")
        .in("campaign_id", ids);

      const seqByCampaign = new Map((seqs ?? []).map((s) => [s.campaign_id!, s]));

      // Lead counts via sequence_leads grouped by sequence_id
      const seqIds = (seqs ?? []).map((s) => s.id);
      const counts = new Map<string, number>();
      if (seqIds.length > 0) {
        const { data: rows } = await supabase
          .from("sequence_leads")
          .select("sequence_id")
          .in("sequence_id", seqIds);
        for (const r of rows ?? []) {
          counts.set(r.sequence_id, (counts.get(r.sequence_id) ?? 0) + 1);
        }
      }

      return (campaigns ?? []).map((c) => {
        const seq = seqByCampaign.get(c.id);
        return {
          ...c,
          sequence_id: seq?.id ?? null,
          sequence_status: seq?.status ?? "draft",
          lead_count: seq ? counts.get(seq.id) ?? 0 : 0,
        };
      });
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

// Returns the auto-created sequence linked to this campaign
export const useCampaignSequence = (campaignId: string | undefined) => {
  return useQuery({
    queryKey: ["campaign_sequence", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .eq("campaign_id", campaignId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
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
      await supabase.from("usage_tracking").insert({
        user_id: user!.id,
        action: "campaign_created",
      });

      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...campaign, user_id: user!.id })
        .select()
        .single();
      if (error) {
        if (error.message?.includes("plan_limit_exceeded:campaigns")) {
          const err = new Error(
            "Du har nått taket för kampanjer på Free-planen. Uppgradera till Starter för fler.",
          );
          (err as any).code = "plan_limit_exceeded:campaigns";
          throw err;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
  });
};

export const useUpdateCampaign = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation(withSaveStatus({
    label: "Kampanj",
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("campaigns").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  }));
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
};
