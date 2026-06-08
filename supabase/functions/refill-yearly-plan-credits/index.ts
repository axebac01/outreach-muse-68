import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Körs dagligen. För varje aktiv årsabonnemang: säkerställ att månadens
// credit-grant finns (idempotent via subscription_credit_grants.UNIQUE).
Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);

    // Hämta aktiva yearly-subs
    const { data: yearlyPrices, error: priceErr } = await supabase
      .from("plan_credit_grants")
      .select("price_id, credits_per_month")
      .eq("billing_interval", "year");
    if (priceErr) throw priceErr;

    const priceMap = new Map(yearlyPrices!.map((p) => [p.price_id, p.credits_per_month]));
    const yearlyPriceIds = Array.from(priceMap.keys());
    if (yearlyPriceIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, granted: 0, reason: "no yearly plans" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: subs, error: subErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, price_id, status, current_period_end, environment")
      .in("price_id", yearlyPriceIds)
      .in("status", ["active", "trialing", "past_due"]);
    if (subErr) throw subErr;

    let granted = 0;
    let skipped = 0;

    for (const sub of subs ?? []) {
      const amount = priceMap.get(sub.price_id as string);
      if (!amount) continue;

      // Hoppa subs som slutat (cancel + utgånget)
      if (sub.current_period_end && new Date(sub.current_period_end as string) < now) {
        skipped++;
        continue;
      }

      // Idempotens-INSERT — UNIQUE(subscription_id, period_start) skyddar
      const { error: logErr } = await supabase
        .from("subscription_credit_grants")
        .insert({
          subscription_id: sub.id,
          user_id: sub.user_id,
          period_start: periodStart,
          amount,
          source: "yearly_cron",
        });

      if (logErr) {
        // 23505 = unique violation → redan tilldelat denna månad, ok
        if ((logErr as any).code === "23505") {
          skipped++;
          continue;
        }
        console.error("Insert grant log failed:", logErr);
        continue;
      }

      const { error: addErr } = await supabase.rpc("add_credits", {
        _user_id: sub.user_id,
        _amount: amount,
        _reason: "grant",
        _kind: "plan",
        _expires_in_days: 60,
        _source_ref: `yearly_refill:${sub.id}:${periodStart}`,
        _metadata: {
          source: "yearly_cron",
          subscription_id: sub.id,
          price_id: sub.price_id,
          period_start: periodStart,
          environment: sub.environment,
        },
      });

      if (addErr) {
        console.error("add_credits failed for sub", sub.id, addErr);
        // Rulla tillbaka idempotens-loggen så vi får retry imorgon
        await supabase
          .from("subscription_credit_grants")
          .delete()
          .eq("subscription_id", sub.id)
          .eq("period_start", periodStart);
        continue;
      }

      granted++;
    }

    return new Response(JSON.stringify({ ok: true, granted, skipped, period_start: periodStart }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refill-yearly-plan-credits error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
