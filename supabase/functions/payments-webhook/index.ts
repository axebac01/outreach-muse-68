import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const kind = session.metadata?.kind;
  const userId = session.metadata?.userId;

  if (kind !== "credit_purchase" || !userId) {
    console.log("Skipping non-credit checkout in handleCheckoutCompleted", { kind });
    return;
  }
  const creditsStr = session.metadata?.credits;
  const credits = parseInt(creditsStr ?? "", 10);
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

function pickPriceId(item: any): string | null {
  return item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id
    || null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = pickPriceId(item);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { error } = await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) console.error("subscriptions upsert error:", error);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (error) console.error("subscriptions delete error:", error);
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  // Vi krediterar bara fakturor som hör till en subscription
  const subId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  if (!subId) {
    console.log("Invoice without subscription, ignored", invoice.id);
    return;
  }
  const reason: string | undefined = invoice.billing_reason;
  if (reason !== "subscription_create" && reason !== "subscription_cycle") {
    console.log("Skipping invoice with billing_reason", reason);
    return;
  }

  // Hämta priser från invoice-rader
  const line = invoice.lines?.data?.find((l: any) => l.price?.lookup_key || l.pricing?.price_details?.price);
  const priceId = line?.price?.lookup_key
    || line?.price?.metadata?.lovable_external_id
    || line?.pricing?.price_details?.price
    || null;
  if (!priceId) {
    console.error("Could not resolve priceId from invoice", invoice.id);
    return;
  }

  const sb = getSupabase();
  const { data: grant } = await sb
    .from("plan_credit_grants")
    .select("credits_per_month, billing_interval")
    .eq("price_id", priceId)
    .maybeSingle();

  if (!grant) {
    console.error("No plan_credit_grants row for priceId", priceId);
    return;
  }

  // Vid årsabonnemang: skippa här — cron sköter månadsvis refill
  if (grant.billing_interval === "year") {
    console.log("Yearly invoice — cron handles monthly refill", invoice.id);
    return;
  }

  // Månadsabonnemang: kreditera credits_per_month, 60 dagars expiry
  const { data: sub } = await sb
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();

  if (!sub?.user_id) {
    console.error("Subscription not found in DB for invoice", subId);
    return;
  }

  const { error } = await sb.rpc("add_credits", {
    _user_id: sub.user_id,
    _amount: grant.credits_per_month,
    _reason: "grant",
    _kind: "plan",
    _expires_in_days: 60,
    _source_ref: `invoice:${invoice.id}`,
    _metadata: {
      source: "plan_monthly",
      price_id: priceId,
      invoice_id: invoice.id,
      environment: env,
    },
  });
  if (error) console.error("Failed to grant plan credits:", error);
  else console.log(`Granted ${grant.credits_per_month} plan credits to ${sub.user_id} for invoice ${invoice.id}`);
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
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_succeeded":
      case "invoice.paid":
        await handleInvoicePaid(event.data.object, env);
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
