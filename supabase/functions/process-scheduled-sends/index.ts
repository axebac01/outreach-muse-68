import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderTemplate } from "../_shared/renderTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_BATCH = 50;

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
  // Compute local time string in tz; fall back to UTC if invalid
  let localStr: string;
  try {
    localStr = now.toLocaleString("en-US", { timeZone: tz, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    localStr = now.toUTCString();
  }
  // Parse "Mon, 14:23"
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
  // Defer 1 hour and let next pass handle re-eval
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  return { ok: false, nextSlot: next };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const result = { processed: 0, sent: 0, cancelled: 0, deferred: 0, failed: 0, paused: 0, requeued: 0 };

  try {
    // (B) Requeue any rows stuck in 'processing' for >10 min — a previous
    // invocation crashed mid-flight. Safe to retry: send-email is the only
    // step with external side effects and runs AFTER the claim flip.
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: requeued } = await admin
      .from("scheduled_sends")
      .update({ status: "scheduled" })
      .eq("status", "processing")
      .lt("updated_at", stuckCutoff)
      .select("id");
    result.requeued = requeued?.length ?? 0;

    // (B) Atomically claim due rows: fetch ids, then flip 'scheduled' → 'processing'
    // and use the RETURNING set as the work list. If two invocations overlap,
    // only one wins each row.
    const { data: candidates } = await admin
      .from("scheduled_sends")
      .select("id")
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

    const due = claimed ?? [];
    if (due.length === 0) {
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache per request
    const sequenceCache = new Map<string, any>();
    const accountCache = new Map<string, any>();
    const limitCache = new Map<string, any>();
    const sentTodayCache = new Map<string, number>();
    const lastSentCache = new Map<string, number>(); // accountId -> ts ms
    const pausedAccounts = new Set<string>(); // accountIds with token errors this run

    const todayStart = startOfDayUtc().toISOString();

    for (const row of due) {
      result.processed++;

      // (C) Skip rows for an account that already token-failed this batch.
      if (pausedAccounts.has(row.email_account_id)) {
        await admin.from("scheduled_sends")
          .update({ status: "paused_account_error", error_message: "Email account needs reconnect" })
          .eq("id", row.id);
        result.paused++;
        continue;
      }


      // Lead status check
      const { data: lead } = await admin
        .from("sequence_leads")
        .select("id, status, email, full_name, first_name, last_name, company, role")
        .eq("id", row.lead_id)
        .maybeSingle();

      if (!lead || ["replied", "unsubscribed", "bounced", "completed"].includes(lead?.status)) {
        await admin.from("scheduled_sends").update({
          status: "cancelled",
          cancelled_reason: lead ? `lead_${lead.status}` : "lead_missing",
        }).eq("id", row.id);
        result.cancelled++;
        continue;
      }

      // Bounce check
      const { data: bounced } = await admin
        .from("bounces")
        .select("id").eq("user_id", row.user_id).ilike("email", lead.email).maybeSingle();
      if (bounced) {
        await admin.from("scheduled_sends").update({
          status: "cancelled",
          cancelled_reason: "bounce",
        }).eq("id", row.id);
        result.cancelled++;
        continue;
      }

      // Sequence
      let seq = sequenceCache.get(row.sequence_id);
      if (!seq) {
        const { data } = await admin.from("sequences").select("*").eq("id", row.sequence_id).maybeSingle();
        seq = data;
        sequenceCache.set(row.sequence_id, seq);
      }
      if (!seq || seq.status === "paused" || seq.status === "completed") {
        if (seq?.status === "completed") {
          await admin.from("scheduled_sends").update({
            status: "cancelled",
            cancelled_reason: "sequence_completed",
          }).eq("id", row.id);
          result.cancelled++;
        } else {
          // Reset claim so a future run picks it up.
          await admin.from("scheduled_sends")
            .update({ status: "scheduled", scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
            .eq("id", row.id);
          result.deferred++;
        }
        continue;
      }

      // Window check
      const sendingDays = Array.isArray(seq.sending_days) ? seq.sending_days : ["mon","tue","wed","thu","fri"];
      const { ok: windowOk, nextSlot } = inWindow(new Date(), sendingDays, seq.sending_window_start, seq.sending_window_end, seq.timezone || "UTC");
      if (!windowOk) {
        await admin.from("scheduled_sends")
          .update({ status: "scheduled", scheduled_for: nextSlot.toISOString() })
          .eq("id", row.id);
        result.deferred++;
        continue;
      }

      // Account + limits
      let acc = accountCache.get(row.email_account_id);
      if (!acc) {
        const { data } = await admin.from("email_accounts").select("*").eq("id", row.email_account_id).maybeSingle();
        acc = data;
        accountCache.set(row.email_account_id, acc);
      }
      if (!acc || acc.status !== "active") {
        // Account inactive/error → pause every scheduled row for this account
        // so the user fixes it once, not row by row.
        pausedAccounts.add(row.email_account_id);
        await admin.from("scheduled_sends")
          .update({ status: "paused_account_error", error_message: `Account status: ${acc?.status ?? "missing"}` })
          .eq("email_account_id", row.email_account_id)
          .in("status", ["scheduled", "processing"]);
        result.paused++;
        continue;
      }

      let limit = limitCache.get(row.email_account_id);
      if (!limit) {
        const { data } = await admin.from("email_account_sending_limits").select("*").eq("email_account_id", row.email_account_id).maybeSingle();
        limit = data;
        limitCache.set(row.email_account_id, limit);
      }
      const cap = effectiveDailyCap(limit, acc.created_at, seq.daily_limit_per_account || 25, acc.provider);

      // Sent today count
      let sentToday = sentTodayCache.get(row.email_account_id);
      if (sentToday === undefined) {
        const { count } = await admin
          .from("email_messages")
          .select("id", { count: "exact", head: true })
          .eq("email_account_id", row.email_account_id)
          .eq("direction", "outbound")
          .eq("status", "sent")
          .gte("sent_at", todayStart);
        sentToday = count || 0;
        sentTodayCache.set(row.email_account_id, sentToday);
      }
      if (sentToday >= cap) {
        const tomorrow = startOfDayUtc(new Date(Date.now() + 24 * 60 * 60 * 1000));
        await admin.from("scheduled_sends")
          .update({ status: "scheduled", scheduled_for: tomorrow.toISOString() })
          .eq("id", row.id);
        result.deferred++;
        continue;
      }

      // Throttle: 30-120s between sends from same inbox
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

      // Step content
      const { data: step } = await admin.from("sequence_steps").select("*").eq("id", row.step_id).maybeSingle();
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

      // Find prior outbound for this lead/sequence to chain reply
      const { data: prior } = await admin
        .from("email_messages")
        .select("message_id_header, thread_key")
        .eq("user_id", row.user_id)
        .eq("lead_id", row.lead_id)
        .eq("sequence_id", row.sequence_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Invoke send-email
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

      // (C) 401 from send-email = token revoked. Pause all scheduled rows for
      // this account, don't mark them failed. User reconnects → admin re-arms.
      if (sendRes.status === 401) {
        pausedAccounts.add(row.email_account_id);
        await admin.from("scheduled_sends")
          .update({ status: "paused_account_error", error_message: "Email account needs reconnect" })
          .eq("email_account_id", row.email_account_id)
          .in("status", ["scheduled", "processing"]);
        result.paused++;
        continue;
      }

      if (!sendRes.ok) {
        const txt = await sendRes.text().catch(() => "");
        await admin.from("scheduled_sends").update({
          status: "failed",
          error_message: txt.slice(0, 500),
        }).eq("id", row.id);
        result.failed++;
        continue;
      }


      // send-email may return 200 + { skipped: true } when last-mile safety
      // (lead status, sequence paused, bounce, unsubscribe) blocked the send.
      // Treat that as a cancel, not a successful send.
      const sendJson = await sendRes.json().catch(() => ({} as any));
      if (sendJson?.skipped) {
        await admin.from("scheduled_sends").update({
          status: "cancelled",
          cancelled_reason: sendJson?.reason || "skipped_last_mile",
          error_message: sendJson?.error?.slice?.(0, 500) ?? null,
        }).eq("id", row.id);
        result.cancelled++;
        continue;
      }

      await admin.from("scheduled_sends").update({ status: "sent" }).eq("id", row.id);
      result.sent++;
      sentTodayCache.set(row.email_account_id, (sentToday || 0) + 1);
      lastSentCache.set(row.email_account_id, Date.now());

      // Schedule next step (if any)
      const { data: nextStep } = await admin
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", row.sequence_id)
        .gt("step_order", step.step_order)
        .order("step_order", { ascending: true })
        .limit(1)
        .maybeSingle();

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
