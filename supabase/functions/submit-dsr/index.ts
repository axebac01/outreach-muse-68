import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_TYPES = new Set([
  "access",
  "deletion",
  "rectification",
  "portability",
  "objection",
  "other",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Honeypot: real browsers leave this empty. Bots fill every field.
    if (body?.company_website && String(body.company_website).trim().length > 0) {
      // Pretend success so bots don't probe.
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = String(body?.email ?? "").trim().toLowerCase();
    const request_type = String(body?.request_type ?? "").trim();
    const description = body?.description
      ? String(body.description).slice(0, 4000)
      : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_TYPES.has(request_type)) {
      return new Response(JSON.stringify({ error: "Invalid request_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lightweight rate limit: same email + type within last 60s = duplicate.
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await admin
      .from("dsr_requests")
      .select("id")
      .eq("email", email)
      .eq("request_type", request_type)
      .gte("created_at", sinceIso)
      .limit(1)
      .maybeSingle();
    if (recent) {
      // Tell client it succeeded — no info leak about prior submission.
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error } = await admin
      .from("dsr_requests")
      .insert({
        email,
        request_type,
        description,
        ip_address: ip,
        user_agent: ua,
      })
      .select("id")
      .single();

    if (error) {
      console.error("DSR insert failed", error);
      return new Response(JSON.stringify({ error: "Failed to submit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort: log to operator's privacy inbox via audit table.
    // (No transactional email yet — operator must monitor the table or hook a webhook.)
    try {
      console.info(JSON.stringify({
        evt: "dsr.submitted",
        id: inserted?.id,
        email,
        request_type,
      }));
    } catch (_) { /* noop */ }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("submit-dsr error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
