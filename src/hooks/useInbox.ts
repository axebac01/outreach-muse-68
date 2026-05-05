import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface InboxThread {
  id: string;
  user_id: string;
  email_account_id: string;
  thread_key: string;
  subject: string | null;
  participants: string[];
  last_message_at: string;
  last_snippet: string | null;
  last_direction: string | null;
  last_sentiment: string | null;
  last_category: string | null;
  unread_count: number;
  message_count: number;
  lead_id: string | null;
  sequence_id: string | null;
  is_archived: boolean;
}

export interface InboxMessage {
  id: string;
  user_id: string;
  email_account_id: string;
  lead_id: string | null;
  sequence_id: string | null;
  direction: "inbound" | "outbound";
  from_address: string;
  to_address: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  message_id_header: string | null;
  in_reply_to: string | null;
  thread_key: string | null;
  thread_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  is_read: boolean;
  status: string;
  sentiment: string | null;
  category: string | null;
  language: string | null;
  suggested_reply: string | null;
  ai_analyzed_at: string | null;
  ai_analysis_error: string | null;
}

export const useInboxThreads = (filters: { accountId?: string; sequenceId?: string; onlyUnread?: boolean } = {}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbox_threads", user?.id, filters],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase.from("email_threads")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (filters.accountId) q = q.eq("email_account_id", filters.accountId);
      if (filters.sequenceId) q = q.eq("sequence_id", filters.sequenceId);
      if (filters.onlyUnread) q = q.gt("unread_count", 0);
      const { data, error } = await q;
      if (error) throw error;
      return data as InboxThread[];
    },
  });
};

export const useThreadMessages = (thread: InboxThread | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbox_messages", thread?.email_account_id, thread?.thread_key],
    enabled: !!user?.id && !!thread,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("user_id", user!.id)
        .eq("email_account_id", thread!.email_account_id)
        .eq("thread_key", thread!.thread_key)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as InboxMessage[];
    },
  });
};

export const useInboxRealtime = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_threads", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["inbox_threads", user.id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["inbox_threads", user.id] });
          qc.invalidateQueries({ queryKey: ["inbox_messages"] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);
};

export const useUnreadInboxCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbox_unread_count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_threads")
        .select("unread_count")
        .eq("user_id", user!.id)
        .gt("unread_count", 0);
      if (error) throw error;
      return (data ?? []).reduce((acc, r) => acc + (r.unread_count ?? 0), 0);
    },
    refetchInterval: 60_000,
  });
};

export const markThreadRead = async (thread: InboxThread) => {
  await supabase.from("email_messages")
    .update({ is_read: true })
    .eq("email_account_id", thread.email_account_id)
    .eq("thread_key", thread.thread_key)
    .eq("is_read", false);
  await supabase.from("email_threads")
    .update({ unread_count: 0 })
    .eq("id", thread.id);
};
