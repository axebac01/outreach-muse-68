import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildUnsubscribePageUrl,
  verifyUnsubscribeToken,
  resolveShortUnsubscribeId,
} from "../_shared/unsubscribe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  const action = url.searchParams.get("action") || "";
  // The functions gateway serves our HTML as text/plain under a sandbox CSP,
  // which strips styling and mangles UTF-8. So a plain browser GET is bounced
  // to the branded app page, which then calls back here with format=json.
  const wantsJson = req.method === "POST" ||
    url.searchParams.get("format") === "json";

  if (!wantsJson) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: buildUnsubscribePageUrl(token) },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tokenKind = token.includes(".") ? "signed" : "short";

  const logEvent = async (
    outcome: "viewed" | "confirmed" | "invalid_token",
    userId?: string | null,
    email?: string | null,
  ) => {
    try {
      await admin.from("unsubscribe_events").insert({
        user_id: userId ?? null,
        email: email ? email.toLowerCase() : null,
        token_kind: tokenKind,
        outcome,
      });
    } catch (_e) {
      // Logging must never block an unsubscribe.
    }
  };

  // Two link formats: the signed token (List-Unsubscribe header) and the
  // short id used in the visible footer link.
  const verified = token.includes(".")
    ? await verifyUnsubscribeToken(token)
    : token
    ? await resolveShortUnsubscribeId(admin, token)
    : null;

  if (!verified) {
    await logEvent("invalid_token");
    return json({ ok: false, error: "invalid_token" }, 400);
  }

  // The branded page first "peeks" to show the address and a confirm button,
  // so link scanners that merely open the URL never unsubscribe anyone.
  if (action === "peek") {
    await logEvent("viewed", verified.userId, verified.email);
    return json({ ok: true, pending: true, email: verified.email });
  }

  await admin.from("unsubscribes").upsert(
    {
      user_id: verified.userId,
      email: verified.email.toLowerCase(),
      source: action === "confirm" ? "link" : "one_click",
    },
    { onConflict: "user_id,email" },
  );

  // Mark any active sequence_leads for this user/email as unsubscribed
  const { data: sLeads } = await admin
    .from("sequence_leads")
    .update({ status: "unsubscribed" })
    .eq("user_id", verified.userId)
    .eq("email", verified.email.toLowerCase())
    .select("id, sequence_id");

  // Cancel pending scheduled sends for these leads
  for (const sl of sLeads || []) {
    await admin
      .from("scheduled_sends")
      .update({ status: "cancelled" })
      .eq("sequence_id", sl.sequence_id)
      .eq("lead_id", sl.id)
      .eq("status", "scheduled");
  }

  await logEvent("confirmed", verified.userId, verified.email);

  return json({ ok: true, email: verified.email });
});
