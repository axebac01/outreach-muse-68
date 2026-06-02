import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useCreditBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setBalance(data?.balance ?? 0);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`credit-wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newBalance = (payload.new as any)?.balance;
          if (typeof newBalance === "number") setBalance(newBalance);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { balance, loading };
}
