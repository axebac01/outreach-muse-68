// Cron-driven inbox sync: iterates ALL active OAuth accounts and invokes
// the existing per-user sync-inbox logic via a service-role internal call.
//
// Triggered by pg_cron every ~10 minutes. verify_jwt=false (uses service key).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const result = { users: 0, accounts: 0, new_messages: 0, errors: [] as any[] };

  try {
    const { data: accounts } = await admin
      .from("email_accounts")
      .select("user_id")
      .eq("status", "active")
      .in("auth_type", ["oauth"]);

    const userIds = Array.from(new Set((accounts ?? []).map((a: any) => a.user_id)));
    result.users = userIds.length;
    result.accounts = accounts?.length ?? 0;

    // Process users in parallel but bounded to avoid blowing the function timeout.
    const BATCH = 5;
    for (let i = 0; i < userIds.length; i += BATCH) {
      const slice = userIds.slice(i, i + BATCH);
      await Promise.all(
        slice.map(async (uid) => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-inbox`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_KEY}`,
                "x-internal-user-id": uid,
              },
              body: "{}",
            });
            if (res.ok) {
              const json = await res.json().catch(() => ({}));
              result.new_messages += json?.new_messages ?? 0;
            } else {
              const txt = await res.text().catch(() => "");
              result.errors.push({ user_id: uid, status: res.status, error: txt.slice(0, 200) });
            }
          } catch (e: any) {
            result.errors.push({ user_id: uid, error: e?.message ?? String(e) });
          }
        }),
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-inbox-cron error", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e), ...result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
