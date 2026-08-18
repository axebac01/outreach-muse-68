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
  website: string | null;

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
    label: "Sekvensinställningar",
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
      const [sends, stepsRes, leads] = await Promise.all([
        fetchAllRows<{ id: string; lead_id: string; status: string; scheduled_for: string | null; updated_at: string | null }>(
          (from, to) =>
            supabase
              .from("scheduled_sends")
              .select("id, lead_id, status, scheduled_for, updated_at")
              .eq("sequence_id", sequenceId!)
              .range(from, to),
        ),
        supabase
          .from("sequence_steps")
          .select("id", { count: "exact", head: true })
          .eq("sequence_id", sequenceId!),
        fetchAllRows<{ id: string; status: string }>((from, to) =>
          supabase
            .from("sequence_leads")
            .select("id, status")
            .eq("sequence_id", sequenceId!)
            .range(from, to),
        ),
      ]);

      if (stepsRes.error) throw stepsRes.error;

      const totalSteps = stepsRes.count ?? 0;


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
const PAGE = 1000;

/** Hämtar alla rader (API:t returnerar max 1000 per anrop). */
async function fetchAllRows<T>(
  build: (from: number, to: number) => any,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

/** Avregistrerade i en kampanj: unika mejladresser, deduplicerat. */
export const useSequenceUnsubscribes = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_unsubscribes", sequenceId],
    enabled: !!sequenceId,
    queryFn: async () => {
      const [leads, unsubs] = await Promise.all([
        fetchAllRows<{ email: string; status: string }>((from, to) =>
          supabase
            .from("sequence_leads")
            .select("email, status")
            .eq("sequence_id", sequenceId!)
            .range(from, to),
        ),
        fetchAllRows<{ email: string; sequence_id: string | null }>((from, to) =>
          supabase.from("unsubscribes").select("email, sequence_id").range(from, to),
        ),
      ]);

      const leadEmails = new Set(leads.map((l) => (l.email ?? "").toLowerCase()).filter(Boolean));
      const emails = new Set<string>();
      for (const l of leads) {
        if (l.status === "unsubscribed" && l.email) emails.add(l.email.toLowerCase());
      }
      for (const u of unsubs) {
        const e = (u.email ?? "").toLowerCase();
        if (!e) continue;
        if (u.sequence_id === sequenceId || leadEmails.has(e)) emails.add(e);
      }
      return { count: emails.size, emails };
    },
  });
};

export const useSequenceLeadCount = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_leads_count", sequenceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sequence_leads")
        .select("id", { count: "exact", head: true })
        .eq("sequence_id", sequenceId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!sequenceId,
  });
};

export const useSequenceLeads = (sequenceId: string | undefined) => {
  return useQuery({
    queryKey: ["sequence_leads", sequenceId],
    queryFn: async () =>
      fetchAllRows<SequenceLead>((from, to) =>
        supabase
          .from("sequence_leads")
          .select("*")
          .eq("sequence_id", sequenceId!)
          .order("created_at", { ascending: true })
          .range(from, to),
      ),
    enabled: !!sequenceId,
  });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSERT_CHUNK = 500;

export const useAddSequenceLeads = (sequenceId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (leads: Array<Partial<SequenceLead> & { email: string }>) => {
      const seen = new Set<string>();
      let invalid = 0;
      let duplicates = 0;

      const cleaned = leads.flatMap((l) => {
        const email = (l.email ?? "").toLowerCase().trim();
        if (!EMAIL_RE.test(email)) {
          invalid++;
          return [];
        }
        if (seen.has(email)) {
          duplicates++;
          return [];
        }
        seen.add(email);
        return [{ ...l, email }];
      });

      // Hoppa över e-postadresser som redan finns i sekvensen
      const existing = await fetchAllRows<{ email: string }>((from, to) =>
        supabase
          .from("sequence_leads")
          .select("email")
          .eq("sequence_id", sequenceId)
          .range(from, to),
      );
      const existingSet = new Set(existing.map((r) => r.email));

      const rows = cleaned
        .filter((l) => {
          if (existingSet.has(l.email)) {
            duplicates++;
            return false;
          }
          return true;
        })
        .map((l) => ({
          sequence_id: sequenceId,
          user_id: user!.id,
          email: l.email,
          full_name: l.full_name ?? null,
          first_name: l.first_name ?? null,
          last_name: l.last_name ?? null,
          role: l.role ?? null,
          phone: l.phone ?? null,
          company: l.company ?? null,
          website: l.website ?? null,
        }));

      let count = 0;
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        const chunk = rows.slice(i, i + INSERT_CHUNK);
        const { error, count: c } = await supabase
          .from("sequence_leads")
          .insert(chunk, { count: "exact" });
        if (error) throw error;
        count += c ?? chunk.length;
      }

      return { count, duplicates, invalid, skipped: duplicates + invalid };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence_leads", sequenceId] });
      qc.invalidateQueries({ queryKey: ["sequence_leads_count", sequenceId] });
    },
  });
};


export const useDeleteSequenceLead = (sequenceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sequence_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence_leads", sequenceId] });
      qc.invalidateQueries({ queryKey: ["sequence_leads_count", sequenceId] });
      qc.invalidateQueries({ queryKey: ["sequence_send_stats", sequenceId] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
};

export const useDeleteSequenceLeads = (sequenceId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase
          .from("sequence_leads")
          .delete()
          .in("id", ids.slice(i, i + CHUNK));
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequence_leads", sequenceId] });
      qc.invalidateQueries({ queryKey: ["sequence_leads_count", sequenceId] });
      qc.invalidateQueries({ queryKey: ["sequence_send_stats", sequenceId] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
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
    label: (step: Partial<SequenceStep> & { step_order: number }) => `Sekvenssteg ${step.step_order + 1}`,
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
    label: "Avsändare",
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

// ---------- Status actions (pause / resume / complete) ----------
export const useSequenceStatusActions = (sequenceId: string, campaignId?: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["campaign_sequence", campaignId] });
    qc.invalidateQueries({ queryKey: ["sequence", sequenceId] });
    qc.invalidateQueries({ queryKey: ["sequences"] });
    qc.invalidateQueries({ queryKey: ["sequence-send-stats", sequenceId] });
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const setStatus = async (status: "active" | "paused" | "completed") => {
    const { error } = await supabase
      .from("sequences")
      .update({ status })
      .eq("id", sequenceId);
    if (error) throw error;
  };

  const pause = useMutation({
    mutationFn: () => setStatus("paused"),
    onSuccess: invalidate,
  });

  const resume = useMutation({
    mutationFn: () => setStatus("active"),
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: async () => {
      await setStatus("completed");
      const { error } = await supabase
        .from("scheduled_sends")
        .update({ status: "cancelled" })
        .eq("sequence_id", sequenceId)
        .eq("user_id", user!.id)
        .eq("status", "scheduled");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { pause, resume, complete };
};
