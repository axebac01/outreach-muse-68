import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useCreditBalance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["credit-wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return { balance: data?.balance ?? 0 };
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`credit-wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newBalance = (payload.new as any)?.balance;
          if (typeof newBalance === "number") {
            queryClient.setQueryData(["credit-wallet", user.id], { balance: newBalance });
          } else {
            queryClient.invalidateQueries({ queryKey: ["credit-wallet", user.id] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return { balance: data?.balance ?? null, loading: isLoading };
}
