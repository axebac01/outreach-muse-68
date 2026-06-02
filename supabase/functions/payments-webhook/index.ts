import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const kind = session.metadata?.kind;
  const userId = session.metadata?.userId;
  const creditsStr = session.metadata?.credits;

  if (kind !== "credit_purchase" || !userId || !creditsStr) {
    console.log("Ignoring non-credit checkout session", { kind, hasUser: !!userId });
    return;
  }

  const credits = parseInt(creditsStr, 10);
  if (!Number.isFinite(credits) || credits <= 0) {
    console.error("Invalid credits in session metadata:", creditsStr);
    return;
  }

  const { error } = await getSupabase().rpc("add_credits", {
    _user_id: userId,
    _amount: credits,
    _reason: "purchase",
    _stripe_session_id: session.id,
    _metadata: {
      amount_total: session.amount_total,
      currency: session.currency,
      customer: session.customer,
    },
  });

  if (error) {
    console.error("Failed to add credits:", error);
    throw error;
  }
  console.log(`Credited ${credits} to user ${userId} for session ${session.id}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook received with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
