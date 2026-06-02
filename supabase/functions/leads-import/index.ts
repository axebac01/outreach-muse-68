import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/leadsCors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userSb.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const marketplaceLeadIds: string[] = Array.isArray(body.marketplace_lead_ids)
      ? body.marketplace_lead_ids.filter((x: unknown) => typeof x === "string").slice(0, 200)
      : [];
    const sequenceId = typeof body.sequence_id === "string" ? body.sequence_id : null;

    if (!sequenceId || marketplaceLeadIds.length === 0) {
      return new Response(JSON.stringify({ error: "sequence_id and marketplace_lead_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify sequence belongs to user
    const { data: seq, error: seqErr } = await adminSb
      .from("sequences")
      .select("id, user_id")
      .eq("id", sequenceId)
      .eq("user_id", userId)
      .single();
    if (seqErr || !seq) {
      return new Response(JSON.stringify({ error: "Sequence not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch leads
    const { data: leads, error: leadsErr } = await adminSb
      .from("marketplace_leads")
      .select("*")
      .eq("user_id", userId)
      .in("id", marketplaceLeadIds);
    if (leadsErr) throw leadsErr;

    const validLeads = (leads ?? []).filter((l: any) => !!l.email);
    if (validLeads.length === 0) {
      return new Response(JSON.stringify({ error: "No revealed leads with email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing leads in this sequence (avoid duplicates)
    const emails = validLeads.map((l: any) => l.email);
    const { data: existing } = await adminSb
      .from("sequence_leads")
      .select("email")
      .eq("sequence_id", sequenceId)
      .in("email", emails);
    const existingEmails = new Set((existing ?? []).map((e: any) => e.email));

    const rows = validLeads
      .filter((l: any) => !existingEmails.has(l.email))
      .map((l: any) => ({
        user_id: userId,
        sequence_id: sequenceId,
        email: l.email,
        full_name: l.full_name,
        first_name: l.first_name,
        last_name: l.last_name,
        company: l.company,
        role: l.title,
        phone: l.phone,
        status: "pending",
      }));

    let inserted = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await adminSb
        .from("sequence_leads")
        .insert(rows, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count ?? rows.length;
    }

    return new Response(
      JSON.stringify({
        inserted,
        skipped: validLeads.length - rows.length,
        total: validLeads.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("leads-import error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
