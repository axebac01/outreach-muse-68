import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Sequence = {
  id: string;
  user_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  timezone: string;
  start_at: string | null;
  sending_days: string[];
  sending_window_start: string;
  sending_window_end: string;
  pause_on_reply: boolean;
  daily_limit_per_account: number;
  created_at: string;
  updated_at: string;
};

export type SequenceLead = {
  id: string;
  sequence_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  current_step: number;
  created_at: string;
};

export type SequenceStep = {
  id: string;
  sequence_id: string;
  user_id: string;
  step_order: number;
  subject: string | null;
  body: string;
  wait_days: number;
};

export type SequenceSender = {
  id: string;
  sequence_id: string;
  email_account_id: string;
  user_id: string;
};

// ---------- Sequences list ----------
export const useSequences = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sequence[];
    },
    enabled: !!user,
  });
};

export const useSequence = (id: string | undefined) => {
  return useQuery({
    queryKey: ["sequence", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sequences").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Sequence | null;
    },
    enabled: !!id,
  });
};

export const useCreateSequence = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name?: string) => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { data, error } = await supabase
        .from("sequences")
        .insert({ user_id: user!.id, name: name || "Untitled sequence", timezone: tz })
        .select()
        .single();
      if (error) throw error;
      return data as Sequence;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
};

export const useUpdateSequence = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Sequence>) => {
      const { error } = await supabase.from("sequences").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence", id] });
      qc.invalidateQueries({ queryKey: ["sequences"] });
    },
  });
};

export const useDeleteSequence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
};

// ---------- Leads ----------
export const useSequenceLeads = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_leads", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_leads")
        .select("*")
        .eq("sequence_id", sequenceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SequenceLead[];
    },
    enabled: !!sequenceId,
  });
};

export const useAddSequenceLeads = (sequenceId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (leads: Array<Partial<SequenceLead> & { email: string }>) => {
      const rows = leads.map((l) => ({
        sequence_id: sequenceId,
        user_id: user!.id,
        email: l.email.toLowerCase().trim(),
        full_name: l.full_name ?? null,
        first_name: l.first_name ?? null,
        last_name: l.last_name ?? null,
        role: l.role ?? null,
        phone: l.phone ?? null,
        company: l.company ?? null,
      }));
      if (rows.length === 0) return { count: 0 };
      const { error, count } = await supabase
        .from("sequence_leads")
        .insert(rows, { count: "exact" });
      if (error) throw error;
      return { count: count ?? rows.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_leads", sequenceId] }),
  });
};

export const useDeleteSequenceLead = (sequenceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sequence_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_leads", sequenceId] }),
  });
};

// ---------- Steps ----------
export const useSequenceSteps = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_steps", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId!)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SequenceStep[];
    },
    enabled: !!sequenceId,
  });
};

export const useUpsertStep = (sequenceId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (step: Partial<SequenceStep> & { step_order: number }) => {
      if (step.id) {
        const { error } = await supabase
          .from("sequence_steps")
          .update({
            subject: step.subject ?? null,
            body: step.body ?? "",
            wait_days: step.wait_days ?? 0,
          })
          .eq("id", step.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sequence_steps").insert({
          sequence_id: sequenceId,
          user_id: user!.id,
          step_order: step.step_order,
          subject: step.subject ?? null,
          body: step.body ?? "",
          wait_days: step.wait_days ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_steps", sequenceId] }),
  });
};

export const useDeleteStep = (sequenceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sequence_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_steps", sequenceId] }),
  });
};

// ---------- Senders ----------
export const useSequenceSenders = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_senders", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_senders")
        .select("*")
        .eq("sequence_id", sequenceId!);
      if (error) throw error;
      return (data ?? []) as SequenceSender[];
    },
    enabled: !!sequenceId,
  });
};

export const useToggleSender = (sequenceId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ accountId, enabled }: { accountId: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from("sequence_senders")
          .insert({ sequence_id: sequenceId, email_account_id: accountId, user_id: user!.id });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("sequence_senders")
          .delete()
          .eq("sequence_id", sequenceId)
          .eq("email_account_id", accountId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_senders", sequenceId] }),
  });
};
