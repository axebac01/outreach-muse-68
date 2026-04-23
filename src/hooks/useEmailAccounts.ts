import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type EmailAccount = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  auth_type: string;
  status: string;
  status_message: string | null;
  last_synced_at: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  imap_host: string | null;
  imap_port: number | null;
  created_at: string;
};

export const useEmailAccounts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["email_accounts"],
    queryFn: async (): Promise<EmailAccount[]> => {
      const { data, error } = await supabase
        .from("email_accounts_safe")
        .select(
          "id,email,display_name,provider,auth_type,status,status_message,last_synced_at,smtp_host,smtp_port,imap_host,imap_port,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmailAccount[];
    },
    enabled: !!user,
  });
};

export const useDeleteEmailAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_accounts"] }),
  });
};
