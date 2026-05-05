import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyUnsubscribeToken } from "../_shared/unsubscribe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function htmlPage(success: boolean, email: string): string {
  const titleSv = success ? "Du är avregistrerad" : "Ogiltig länk";
  const titleEn = success ? "You're unsubscribed" : "Invalid link";
  const bodySv = success
    ? `${email} kommer inte längre få mejl från oss.`
    : "Länken är ogiltig eller har gått ut.";
  const bodyEn = success
    ? `${email} will no longer receive emails from us.`
    : "This link is invalid or has expired.";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titleEn}</title><style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{background:#fff;padding:48px 40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06);max-width:440px;text-align:center}
h1{margin:0 0 8px;font-size:22px}h2{margin:24px 0 4px;font-size:16px;color:#475569;font-weight:500}
p{margin:0;color:#64748b;font-size:14px;line-height:1.5}
.icon{width:48px;height:48px;border-radius:50%;background:${
    success ? "#dcfce7" : "#fee2e2"
  };display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:24px}
</style></head><body><div class="card">
<div class="icon">${success ? "✓" : "✕"}</div>
<h1>${titleEn}</h1><p>${bodyEn}</p>
<h2>${titleSv}</h2><p>${bodySv}</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";

  const verified = await verifyUnsubscribeToken(token);
  if (!verified) {
    return new Response(htmlPage(false, ""), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await admin.from("unsubscribes").upsert(
    {
      user_id: verified.userId,
      email: verified.email.toLowerCase(),
      source: req.method === "POST" ? "one_click" : "link",
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

  if (req.method === "POST") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(htmlPage(true, verified.email), {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
