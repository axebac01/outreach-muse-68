import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useOutreachForLead = (leadId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["outreach", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_outreach")
        .select("*")
        .eq("lead_id", leadId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!leadId,
  });
};

export const useApproveOutreach = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outreachId: string) => {
      const { error } = await supabase
        .from("generated_outreach")
        .update({ status: "approved" })
        .eq("id", outreachId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
    },
  });
};
