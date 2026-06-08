import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderTemplate } from "../_shared/renderTemplate.ts";
import { redactSecrets } from "../_shared/redactSecrets.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_BATCH = 200;
const SOFT_TIME_BUDGET_MS = 20_000;
const MAX_ATTEMPTS = 3;

function startOfDayUtc(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

// Provider-specific safe ceilings — must match src/hooks/useSendingLimits.ts.
function providerCeiling(provider: string | null | undefined): number {
  switch ((provider || "").toLowerCase()) {
    case "gmail": return 400;
    case "outlook": return 300;
    case "smtp": return 100;
    default: return 100;
  }
}

function effectiveDailyCap(limit: any, accountCreatedAt: string, sequenceLimit: number, provider?: string | null): number {
  const ceiling = providerCeiling(provider);
  const seqCap = Math.min(sequenceLimit, ceiling);
  if (!limit || !limit.warmup_enabled) {
    return Math.min(limit?.daily_cap_override ?? seqCap, ceiling);
  }
  const start = new Date(limit.warmup_started_at || accountCreatedAt).getTime();
  const dayNum = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)) + 1;
  if (dayNum >= 14) return Math.min(limit.daily_cap_override ?? seqCap, ceiling);
  return Math.min(20 + dayNum * 5, ceiling);
}

function inWindow(now: Date, sendingDays: string[], startHHmm: string, endHHmm: string, tz: string): { ok: boolean; nextSlot: Date } {
  let localStr: string;
  try {
    localStr = now.toLocaleString("en-US", { timeZone: tz, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    localStr = now.toUTCString();
  }
  const m = localStr.match(/(\w{3})[^\d]*(\d{1,2}):(\d{2})/);
  const dow = (m?.[1] ?? "").toLowerCase();
  const hh = parseInt(m?.[2] ?? "0", 10);
  const mm = parseInt(m?.[3] ?? "0", 10);
  const [sh, sm] = startHHmm.split(":").map(Number);
  const [eh, em] = endHHmm.split(":").map(Number);
  const dayOk = sendingDays.map((d) => d.toLowerCase()).includes(dow);
  const minutesNow = hh * 60 + mm;
  const minutesStart = sh * 60 + sm;
  const minutesEnd = eh * 60 + em;
  const timeOk = minutesNow >= minutesStart && minutesNow < minutesEnd;
  if (dayOk && timeOk) return { ok: true, nextSlot: now };
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  return { ok: false, nextSlot: next };
}

// Round-robin a list grouped by `keyFn` so no single key monopolizes processing.
function interleaveByKey<T>(items: T[], keyFn: (t: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    const g = groups.get(k);
    if (g) g.push(it); else groups.set(k, [it]);
  }
  const queues = Array.from(groups.values());
  const out: T[] = [];
  let i = 0;
  while (out.length < items.length) {
    const q = queues[i % queues.length];
    if (q.length > 0) out.push(q.shift()!);
    i++;
    if (i > items.length * queues.length) break; // safety
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const tStart = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const result = { processed: 0, sent: 0, cancelled: 0, deferred: 0, failed: 0, paused: 0, requeued: 0, retried: 0, time_budget_hit: false };

  try {
    // Recovery: requeue rows stuck in 'processing' for >10 min.
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: requeued } = await admin
      .from("scheduled_sends")
      .update({ status: "scheduled" })
      .eq("status", "processing")
      .lt("updated_at", stuckCutoff)
      .select("id");
    result.requeued = requeued?.length ?? 0;

    // Atomically claim due rows.
    const { data: candidates } = await admin
      .from("scheduled_sends")
      .select("id, user_id")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(MAX_BATCH);

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateIds = candidates.map((r: any) => r.id);
    const { data: claimed } = await admin
      .from("scheduled_sends")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .in("id", candidateIds)
      .eq("status", "scheduled")
      .select("*");

    let due = claimed ?? [];
    if (due.length === 0) {
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fairness: round-robin by user so a single user can't hog a batch.
    due = interleaveByKey(due, (r: any) => r.user_id);

    // ----- Batched preloads (kills the N+1) -----
    const leadIds = Array.from(new Set(due.map((r: any) => r.lead_id).filter(Boolean)));
    const seqIds = Array.from(new Set(due.map((r: any) => r.sequence_id).filter(Boolean)));
    const accIds = Array.from(new Set(due.map((r: any) => r.email_account_id).filter(Boolean)));
    const stepIds = Array.from(new Set(due.map((r: any) => r.step_id).filter(Boolean)));
    const userIds = Array.from(new Set(due.map((r: any) => r.user_id).filter(Boolean)));

    const [
      leadsRes,
      seqsRes,
      accsRes,
      limitsRes,
      stepsRes,
      bouncesRes,
      sentTodayRpc,
    ] = await Promise.all([
      admin.from("sequence_leads")
        .select("id, status, email, full_name, first_name, last_name, company, role")
        .in("id", leadIds.length ? leadIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("sequences").select("*").in("id", seqIds.length ? seqIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("email_accounts").select("*").in("id", accIds.length ? accIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("email_account_sending_limits").select("*").in("email_account_id", accIds.length ? accIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("sequence_steps").select("*").in("id", stepIds.length ? stepIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("bounces").select("user_id, email").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      // Aggregated count via RPC — avoids hauling rows back just to count.
      admin.rpc("get_sent_today_by_account", { account_ids: accIds.length ? accIds : ["00000000-0000-0000-0000-000000000000"] }),
    ]);


    const leadById = new Map<string, any>();
    for (const l of leadsRes.data ?? []) leadById.set(l.id, l);
    const seqById = new Map<string, any>();
    for (const s of seqsRes.data ?? []) seqById.set(s.id, s);
    const accById = new Map<string, any>();
    for (const a of accsRes.data ?? []) accById.set(a.id, a);
    const limitByAcc = new Map<string, any>();
    for (const l of limitsRes.data ?? []) limitByAcc.set(l.email_account_id, l);
    const stepById = new Map<string, any>();
    for (const st of stepsRes.data ?? []) stepById.set(st.id, st);

    // Bounce set keyed by `user_id|email_lower`
    const bouncedSet = new Set<string>();
    for (const b of bouncesRes.data ?? []) {
      bouncedSet.add(`${b.user_id}|${String(b.email).toLowerCase()}`);
    }

    const sentTodayByAcc = new Map<string, number>();
    for (const r of (sentTodayRpc.data ?? []) as Array<{ email_account_id: string; sent_count: number }>) {
      sentTodayByAcc.set(r.email_account_id, Number(r.sent_count) || 0);
    }

    // Plan-cap per user för daily sends
    const planCapByUser = new Map<string, number>();
    await Promise.all(userIds.map(async (uid) => {
      const { data } = await admin.rpc("get_plan_limit", { user_uuid: uid, resource: "daily_sends_per_account" });
      const v = Number(data);
      planCapByUser.set(uid, Number.isFinite(v) && v > 0 ? v : 50);
    }));

    // Per-run state
    const lastSentCache = new Map<string, number>();
    const pausedAccounts = new Set<string>();
    const stepOrderCache = new Map<string, any>(); // `${seqId}|${step_order}` → nextStep

    // Seed throttle cache from persisted last_send_at so the 30-120s gap
    // also applies across cron runs (not just within one batch).
    for (const a of accsRes.data ?? []) {
      if (a.last_send_at) {
        const t = new Date(a.last_send_at).getTime();
        if (!Number.isNaN(t)) lastSentCache.set(a.id, t);
      }
    }


    for (const row of due) {
      // Soft time budget — let cron call us again rather than 504-ing mid-batch.
      if (Date.now() - tStart > SOFT_TIME_BUDGET_MS) {
        result.time_budget_hit = true;
        // Release the unprocessed claims back to scheduled.
        const remaining = due.slice(due.indexOf(row)).map((r: any) => r.id);
        if (remaining.length > 0) {
          await admin.from("scheduled_sends")
            .update({ status: "scheduled" })
            .in("id", remaining)
            .eq("status", "processing");
        }
        break;
      }

      result.processed++;

      if (pausedAccounts.has(row.email_account_id)) {
        await admin.from("scheduled_sends")
          .update({ status: "paused_account_error", error_message: "Email account needs reconnect" })
          .eq("id", row.id);
        result.paused++;
        continue;
      }

      const lead = leadById.get(row.lead_id);
      if (!lead || ["replied", "unsubscribed", "bounced", "completed"].includes(lead.status)) {
        await admin.from("scheduled_sends").update({
          status: "cancelled",
          cancelled_reason: lead ? `lead_${lead.status}` : "lead_missing",
        }).eq("id", row.id);
        result.cancelled++;
        continue;
      }

      if (bouncedSet.has(`${row.user_id}|${String(lead.email).toLowerCase()}`)) {
        await admin.from("scheduled_sends").update({
          status: "cancelled",
          cancelled_reason: "bounce",
        }).eq("id", row.id);
        result.cancelled++;
        continue;
      }

      const seq = seqById.get(row.sequence_id);
      if (!seq || seq.status === "paused" || seq.status === "completed") {
        if (seq?.status === "completed") {
          await admin.from("scheduled_sends").update({
            status: "cancelled",
            cancelled_reason: "sequence_completed",
          }).eq("id", row.id);
          result.cancelled++;
        } else {
          await admin.from("scheduled_sends")
            .update({ status: "scheduled", scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
            .eq("id", row.id);
          result.deferred++;
        }
        continue;
      }

      const sendingDays = Array.isArray(seq.sending_days) ? seq.sending_days : ["mon","tue","wed","thu","fri"];
      const { ok: windowOk, nextSlot } = inWindow(new Date(), sendingDays, seq.sending_window_start, seq.sending_window_end, seq.timezone || "UTC");
      if (!windowOk) {
        await admin.from("scheduled_sends")
          .update({ status: "scheduled", scheduled_for: nextSlot.toISOString() })
          .eq("id", row.id);
        result.deferred++;
        continue;
      }

      const acc = accById.get(row.email_account_id);
      if (!acc || acc.status !== "active") {
        pausedAccounts.add(row.email_account_id);
        await admin.from("scheduled_sends")
          .update({ status: "paused_account_error", error_message: `Account status: ${acc?.status ?? "missing"}` })
          .eq("email_account_id", row.email_account_id)
          .in("status", ["scheduled", "processing"]);
        result.paused++;
        continue;
      }

      const limit = limitByAcc.get(row.email_account_id);
      const rawCap = effectiveDailyCap(limit, acc.created_at, seq.daily_limit_per_account || 25, acc.provider);
      const planCap = planCapByUser.get(row.user_id) ?? 50;
      const cap = Math.min(rawCap, planCap);

      const sentToday = sentTodayByAcc.get(row.email_account_id) ?? 0;
      if (sentToday >= cap) {
        const tomorrow = startOfDayUtc(new Date(Date.now() + 24 * 60 * 60 * 1000));
        await admin.from("scheduled_sends")
          .update({ status: "scheduled", scheduled_for: tomorrow.toISOString() })
          .eq("id", row.id);
        result.deferred++;
        continue;
      }

      // Throttle: 30-120s between sends from same inbox (within this batch run).
      const lastSent = lastSentCache.get(row.email_account_id) ?? 0;
      const minGap = 30_000 + Math.floor(Math.random() * 90_000);
      const earliest = lastSent + minGap;
      if (Date.now() < earliest) {
        await admin.from("scheduled_sends")
          .update({ status: "scheduled", scheduled_for: new Date(earliest).toISOString() })
          .eq("id", row.id);
        result.deferred++;
        continue;
      }

      const step = stepById.get(row.step_id);
      if (!step) {
        await admin.from("scheduled_sends").update({ status: "failed", error_message: "step missing" }).eq("id", row.id);
        result.failed++;
        continue;
      }

      const vars = {
        first_name: lead.first_name || (lead.full_name?.split(" ")[0] ?? ""),
        last_name: lead.last_name || "",
        full_name: lead.full_name || "",
        company: lead.company || "",
        role: lead.role || "",
        email: lead.email,
      };
      const subject = renderTemplate(step.subject || "", vars);
      const rawBody = renderTemplate(step.body || "", vars);
      const isHtml = /<\/?[a-z][\s\S]*?>/i.test(rawBody);

      // Prior outbound for chain reply — kept per-row but only fires when step_order > 1.
      let prior: any = null;
      if ((step.step_order ?? 0) > 1) {
        const { data } = await admin
          .from("email_messages")
          .select("message_id_header, thread_key")
          .eq("user_id", row.user_id)
          .eq("lead_id", row.lead_id)
          .eq("sequence_id", row.sequence_id)
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        prior = data;
      }

      const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          internal_user_id: row.user_id,
          email_account_id: row.email_account_id,
          to: lead.email,
          subject,
          body_html: isHtml ? rawBody : undefined,
          body_text: isHtml ? undefined : rawBody,
          lead_id: row.lead_id,
          sequence_id: row.sequence_id,
          thread_key: prior?.thread_key,
          in_reply_to: prior?.message_id_header,
        }),
      });

      if (sendRes.status === 401) {
        pausedAccounts.add(row.email_account_id);
        await admin.from("scheduled_sends")
          .update({ status: "paused_account_error", error_message: "Email account needs reconnect" })
          .eq("email_account_id", row.email_account_id)
          .in("status", ["scheduled", "processing"]);
        result.paused++;
        continue;
      }

      // 503 = transient. Retry up to MAX_ATTEMPTS with backoff; then fail.
      if (sendRes.status === 503) {
        const txt = await sendRes.text().catch(() => "");
        const nextAttempts = (row.attempts ?? 0) + 1;
        if (nextAttempts < MAX_ATTEMPTS) {
          const backoffMin = Math.pow(3, nextAttempts); // 3min, 9min
          await admin.from("scheduled_sends").update({
            status: "scheduled",
            scheduled_for: new Date(Date.now() + backoffMin * 60 * 1000).toISOString(),
            attempts: nextAttempts,
            error_message: redactSecrets(txt).slice(0, 500),
          }).eq("id", row.id);
          result.retried++;
        } else {
          await admin.from("scheduled_sends").update({
            status: "failed",
            attempts: nextAttempts,
            error_message: `Transient after ${MAX_ATTEMPTS} attempts: ${redactSecrets(txt).slice(0, 400)}`,
          }).eq("id", row.id);
          result.failed++;
        }
        continue;
      }

      if (!sendRes.ok) {
        const txt = await sendRes.text().catch(() => "");
        await admin.from("scheduled_sends").update({
          status: "failed",
          error_message: redactSecrets(txt).slice(0, 500),
        }).eq("id", row.id);
        result.failed++;
        continue;
      }

      const sendJson = await sendRes.json().catch(() => ({} as any));
      if (sendJson?.skipped) {
        await admin.from("scheduled_sends").update({
          status: "cancelled",
          cancelled_reason: sendJson?.reason || "skipped_last_mile",
          error_message: sendJson?.error ? redactSecrets(sendJson.error).slice(0, 500) : null,
        }).eq("id", row.id);
        result.cancelled++;
        continue;
      }

      await admin.from("scheduled_sends").update({ status: "sent", attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
      result.sent++;
      sentTodayByAcc.set(row.email_account_id, sentToday + 1);
      lastSentCache.set(row.email_account_id, Date.now());
      // Persist last_send_at so cross-cron throttle works. Best-effort; failure
      // here doesn't roll back the send.
      admin.from("email_accounts")
        .update({ last_send_at: new Date().toISOString() })
        .eq("id", row.email_account_id)
        .then(() => {}, () => {});


      // Next step. Cache lookup per (seq, current step_order) so two rows on
      // the same step in the same batch don't both hit the DB.
      const nextKey = `${row.sequence_id}|${step.step_order}`;
      let nextStep = stepOrderCache.get(nextKey);
      if (nextStep === undefined) {
        const { data } = await admin
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", row.sequence_id)
          .gt("step_order", step.step_order)
          .order("step_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        nextStep = data ?? null;
        stepOrderCache.set(nextKey, nextStep);
      }

      if (nextStep) {
        const waitMs = (nextStep.wait_days || 0) * 24 * 60 * 60 * 1000;
        const nextAt = new Date(Date.now() + waitMs);
        await admin.from("scheduled_sends").insert({
          sequence_id: row.sequence_id,
          lead_id: row.lead_id,
          step_id: nextStep.id,
          email_account_id: row.email_account_id,
          user_id: row.user_id,
          scheduled_for: nextAt.toISOString(),
          status: "scheduled",
        });
        await admin.from("sequence_leads")
          .update({ current_step: step.step_order + 1 })
          .eq("id", row.lead_id);
      } else {
        await admin.from("sequence_leads")
          .update({ status: "completed", current_step: step.step_order + 1 })
          .eq("id", row.lead_id);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("processor error", e);
    return new Response(JSON.stringify({ error: (e as Error).message, ...result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
