import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { withSaveStatus } from "./useSaveStatus";

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
  return useMutation(withSaveStatus({
    mutationFn: async (patch: Partial<Sequence>) => {
      const { error } = await supabase.from("sequences").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence", id] });
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["campaign_sequence"] });
    },
  }));
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

// ---------- Send stats ----------
export type LeadSendStat = {
  sent: number;
  scheduled: number;
  failed: number;
  total: number;
  lastStatus: string | null;
  lastAt: string | null;
};

export const useSequenceSendStats = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_send_stats", sequenceId],
    queryFn: async () => {
      const [sendsRes, stepsRes, leadsRes] = await Promise.all([
        supabase
          .from("scheduled_sends")
          .select("id, lead_id, status, scheduled_for, updated_at")
          .eq("sequence_id", sequenceId!),
        supabase
          .from("sequence_steps")
          .select("id", { count: "exact", head: true })
          .eq("sequence_id", sequenceId!),
        supabase
          .from("sequence_leads")
          .select("id, status")
          .eq("sequence_id", sequenceId!),
      ]);
      if (sendsRes.error) throw sendsRes.error;
      if (stepsRes.error) throw stepsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const sends = sendsRes.data ?? [];
      const totalSteps = stepsRes.count ?? 0;
      const leads = leadsRes.data ?? [];

      const summary = { sent: 0, scheduled: 0, failed: 0, replied: 0 };
      const byLeadId = new Map<string, LeadSendStat>();

      for (const s of sends) {
        if (s.status === "sent") summary.sent++;
        else if (s.status === "scheduled") summary.scheduled++;
        else if (s.status === "failed") summary.failed++;

        const cur = byLeadId.get(s.lead_id) ?? {
          sent: 0,
          scheduled: 0,
          failed: 0,
          total: totalSteps,
          lastStatus: null as string | null,
          lastAt: null as string | null,
        };
        if (s.status === "sent") cur.sent++;
        else if (s.status === "scheduled") cur.scheduled++;
        else if (s.status === "failed") cur.failed++;

        const ts = s.updated_at ?? s.scheduled_for;
        if (!cur.lastAt || (ts && ts > cur.lastAt)) {
          cur.lastAt = ts;
          cur.lastStatus = s.status;
        }
        byLeadId.set(s.lead_id, cur);
      }

      for (const l of leads) {
        if (l.status === "replied") summary.replied++;
      }

      return { summary, byLeadId, totalSteps };
    },
    enabled: !!sequenceId,
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
  return useMutation(withSaveStatus({
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence_steps", sequenceId] });
    },
  }));
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
  return useMutation(withSaveStatus({
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence_senders", sequenceId] });
    },
  }));
};
