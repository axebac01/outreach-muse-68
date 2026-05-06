// Retention job — deletes visits/visitors/companies older than the configured window.
// Triggered via pg_cron daily.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const now = Date.now();
    const visitsCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    const visitorsCutoff = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString();
    const companiesCutoff = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();

    const v = await admin.from("visits").delete().lt("created_at", visitsCutoff).select("id");
    const vi = await admin.from("visitors").delete().lt("last_seen_at", visitorsCutoff).select("id");
    const c = await admin.from("inbound_companies").delete().lt("last_seen_at", companiesCutoff).select("id");

    return new Response(JSON.stringify({
      ok: true,
      visits_deleted: v.data?.length ?? 0,
      visitors_deleted: vi.data?.length ?? 0,
      companies_deleted: c.data?.length ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("purge-old-visits error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
