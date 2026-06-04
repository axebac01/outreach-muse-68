import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const sequenceId = body?.sequence_id;
    if (!sequenceId || typeof sequenceId !== "string") {
      return new Response(JSON.stringify({ error: "sequence_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: seq, error: seqErr } = await admin
      .from("sequences")
      .select("*")
      .eq("id", sequenceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (seqErr || !seq) {
      return new Response(JSON.stringify({ error: "Sequence not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard against re-launch duplication. Only 'draft' or 'paused' may launch.
    // Checking scheduled_sends count is wrong — after a sequence completes, all
    // rows have status 'sent' so the count guard would let a re-launch through
    // and duplicate every email.
    if (!["draft", "paused"].includes(seq.status)) {
      return new Response(
        JSON.stringify({ error: `Sekvensen är redan startad (status: ${seq.status}).` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }




    const [{ data: leadsRaw }, { data: steps }, { data: senders }, { data: unsubs }] = await Promise.all([
      admin.from("sequence_leads").select("id,email").eq("sequence_id", sequenceId).eq("status", "pending"),
      admin.from("sequence_steps").select("*").eq("sequence_id", sequenceId).order("step_order"),
      admin.from("sequence_senders").select("email_account_id").eq("sequence_id", sequenceId),
      admin.from("unsubscribes").select("email").eq("user_id", user.id),
    ]);

    const unsubSet = new Set((unsubs ?? []).map((u: any) => String(u.email).toLowerCase()));
    const leads = (leadsRaw ?? []).filter((l: any) => !unsubSet.has(String(l.email ?? "").toLowerCase()));

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ error: "No pending leads" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!steps || steps.length === 0) {
      return new Response(JSON.stringify({ error: "No steps configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!senders || senders.length === 0) {
      return new Response(JSON.stringify({ error: "No sender accounts selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstStep = steps[0];
    const startAt = seq.start_at ? new Date(seq.start_at) : new Date();

    const senderIds = senders.map((s: any) => s.email_account_id);
    const dailyLimit = seq.daily_limit_per_account || 25;
    const totalCapacity = senderIds.length * dailyLimit;

    const rows = leads.map((lead: any, i: number) => {
      const senderId = senderIds[i % senderIds.length];
      const dayOffset = Math.floor(i / totalCapacity);
      const scheduled = new Date(startAt);
      scheduled.setDate(scheduled.getDate() + dayOffset);
      return {
        sequence_id: sequenceId,
        lead_id: lead.id,
        step_id: firstStep.id,
        email_account_id: senderId,
        user_id: user.id,
        scheduled_for: scheduled.toISOString(),
        status: "scheduled",
      };
    });

    const { error: insertErr } = await admin.from("scheduled_sends").insert(rows);
    if (insertErr) {
      // Do NOT mark sequence active if scheduling failed.
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only flip status AFTER scheduled_sends are persisted.
    await admin.from("sequences").update({ status: "active" }).eq("id", sequenceId);
    await admin
      .from("sequence_leads")
      .update({ status: "active", current_step: 0 })
      .eq("sequence_id", sequenceId)
      .eq("status", "pending");

    return new Response(JSON.stringify({ scheduled: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
