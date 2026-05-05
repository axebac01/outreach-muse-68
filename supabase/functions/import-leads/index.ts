import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const apiKey = auth.replace(/^Bearer\s+/i, "").trim();
  if (!apiKey) return json(401, { error: "Missing API key" });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const keyHash = await sha256(apiKey);
  const { data: keyRow, error: keyErr } = await supabase
    .from("integration_api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr || !keyRow || keyRow.revoked_at) return json(401, { error: "Invalid API key" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const source = typeof body?.source === "string" ? body.source.slice(0, 100) : "external";
  const target = body?.target ?? { type: "none" };
  const targetType = ["sequence", "campaign", "none"].includes(target?.type) ? target.type : "none";
  const targetId = typeof target?.id === "string" ? target.id : null;
  const leads: any[] = Array.isArray(body?.leads) ? body.leads : [];

  if (leads.length > 1000) return json(400, { error: "Max 1000 leads per request" });

  const userId = keyRow.user_id;

  // Connection test (empty leads)
  if (leads.length === 0) {
    await supabase.from("lead_import_log").insert({
      user_id: userId, api_key_id: keyRow.id, source,
      payload_count: 0, inserted_count: 0, skipped_count: 0,
      target_type: targetType, target_id: targetId,
    });
    await supabase.from("integration_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    return json(200, { ok: true, inserted: 0, skipped: 0, message: "Connection OK" });
  }

  // Validate & normalize
  const seen = new Set<string>();
  const valid: any[] = [];
  let skipped = 0;
  for (const l of leads) {
    const email = typeof l?.email === "string" ? l.email.toLowerCase().trim() : "";
    if (!EMAIL_RE.test(email) || seen.has(email)) { skipped++; continue; }
    seen.add(email);
    valid.push({
      email,
      full_name: l.full_name ?? null,
      first_name: l.first_name ?? null,
      last_name: l.last_name ?? null,
      company: l.company ?? null,
      role: l.role ?? null,
      phone: l.phone ?? null,
      website: l.website ?? null,
      linkedin_url: l.linkedin_url ?? null,
      notes: l.notes ?? null,
    });
  }

  let inserted = 0;
  let errorMsg: string | null = null;
  let resolvedTargetId = targetId;

  try {
    if (targetType === "campaign") {
      if (!targetId) throw new Error("target.id required for campaign");
      // Verify campaign belongs to user
      const { data: c } = await supabase.from("campaigns").select("id").eq("id", targetId).eq("user_id", userId).maybeSingle();
      if (!c) throw new Error("Campaign not found");
      const rows = valid.map((l) => ({
        user_id: userId,
        campaign_id: targetId,
        email: l.email,
        full_name: l.full_name || l.email.split("@")[0],
        company: l.company || (l.email.split("@")[1]?.split(".")[0] ?? "Unknown"),
        role: l.role,
        website: l.website,
        linkedin_url: l.linkedin_url,
        notes: l.notes,
      }));
      const { data, error } = await supabase.from("leads").insert(rows).select("id");
      if (error) throw error;
      inserted = data?.length ?? 0;
    } else {
      // sequence or none -> sequence_leads
      let seqId = targetId;
      if (targetType === "none" || !seqId) {
        // Find or create default "Imported leads" sequence
        const { data: existing } = await supabase
          .from("sequences")
          .select("id")
          .eq("user_id", userId)
          .eq("name", "Imported leads")
          .maybeSingle();
        if (existing) {
          seqId = existing.id;
        } else {
          const { data: created, error: cErr } = await supabase
            .from("sequences")
            .insert({ user_id: userId, name: "Imported leads", timezone: "UTC" })
            .select("id")
            .single();
          if (cErr) throw cErr;
          seqId = created.id;
        }
      } else {
        const { data: s } = await supabase.from("sequences").select("id").eq("id", seqId).eq("user_id", userId).maybeSingle();
        if (!s) throw new Error("Sequence not found");
      }
      resolvedTargetId = seqId;

      // De-dup against existing emails in the sequence
      const { data: existingLeads } = await supabase
        .from("sequence_leads")
        .select("email")
        .eq("sequence_id", seqId)
        .in("email", valid.map((l) => l.email));
      const existingSet = new Set((existingLeads ?? []).map((r: any) => r.email));
      const fresh = valid.filter((l) => !existingSet.has(l.email));
      const dedupSkipped = valid.length - fresh.length;
      skipped += dedupSkipped;

      if (fresh.length > 0) {
        const rows = fresh.map((l) => ({
          user_id: userId,
          sequence_id: seqId,
          email: l.email,
          full_name: l.full_name,
          first_name: l.first_name,
          last_name: l.last_name,
          company: l.company,
          role: l.role,
          phone: l.phone,
        }));
        const { data, error } = await supabase.from("sequence_leads").insert(rows).select("id");
        if (error) throw error;
        inserted = data?.length ?? 0;
      }
    }
  } catch (e: any) {
    errorMsg = e?.message || String(e);
  }

  await supabase.from("lead_import_log").insert({
    user_id: userId, api_key_id: keyRow.id, source,
    payload_count: leads.length, inserted_count: inserted, skipped_count: skipped,
    target_type: targetType, target_id: resolvedTargetId, error: errorMsg,
  });
  await supabase.from("integration_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

  if (errorMsg) return json(400, { ok: false, error: errorMsg, inserted, skipped });
  return json(200, { ok: true, inserted, skipped, target: { type: targetType, id: resolvedTargetId } });
});
