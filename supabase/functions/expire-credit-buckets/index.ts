// Cron-triggered edge function that runs the bucket-expiry routine once per day.
// Called by pg_cron via net.http_post — see the cron job in the database for schedule.

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("expire_credit_buckets");
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, users_affected: data }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("expire-credit-buckets failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
