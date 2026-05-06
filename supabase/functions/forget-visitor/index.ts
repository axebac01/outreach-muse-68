// Public "right to be forgotten" endpoint.
// Deletes all visits/visitors for a given visitor_id under a site_key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const { site_key, visitor_id } = body || {};
    if (!site_key || !visitor_id) {
      return new Response(JSON.stringify({ error: "Missing site_key or visitor_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: site } = await admin
      .from("tracking_sites")
      .select("id")
      .eq("site_key", site_key)
      .maybeSingle();
    if (!site) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("visits").delete().eq("site_id", site.id).eq("visitor_id", visitor_id);
    await admin.from("visitors").delete().eq("site_id", site.id).eq("visitor_id", visitor_id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("forget-visitor error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
