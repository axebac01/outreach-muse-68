import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { withSaveStatus } from "./useSaveStatus";

export type DeliverabilityCheckResult = {
  domain: string;
  spf: { status: "ok" | "missing" };
  dkim: { status: "ok" | "missing" };
  dmarc: { status: "ok" | "missing" };
  score: "good" | "warn" | "bad";
  checked_at: string;
};

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
  signature: string | null;
  sender_name: string | null;
  created_at: string;
  paused_reason: string | null;
  paused_at: string | null;
  deliverability_check: DeliverabilityCheckResult | null;
  deliverability_checked_at: string | null;
};

export const useEmailAccounts = () => {
  const { user, ready } = useAuth();
  return useQuery({
    queryKey: ["email_accounts", user?.id],
    queryFn: async (): Promise<EmailAccount[]> => {
      const { data, error } = await supabase
        .from("email_accounts_safe")
        .select(
          "id,email,display_name,provider,auth_type,status,status_message,last_synced_at,smtp_host,smtp_port,imap_host,imap_port,signature,sender_name,created_at,paused_reason,paused_at,deliverability_check,deliverability_checked_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmailAccount[];
    },
    enabled: ready && !!user?.id,
  });
};


export const useUpdateEmailAccount = () => {
  const qc = useQueryClient();
  return useMutation(withSaveStatus({
    label: "E-postkonto",
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<EmailAccount, "signature" | "sender_name">> }) => {
      const { error } = await supabase
        .from("email_accounts")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_accounts"] }),
  }));
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
