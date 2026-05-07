import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_VARS = [
  "first_name","last_name","full_name","company","role","email","phone",
  "sender_name","sender_email","sender_signature","unsubscribe",
];

function sanitizeBody(text: string): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_m, key: string) =>
    ALLOWED_VARS.includes(key.toLowerCase()) ? `{{${key.toLowerCase()}}}` : "",
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const subject: string = (body?.subject ?? "").toString().slice(0, 300);
    const stepBody: string = (body?.body ?? "").toString().slice(0, 5000);
    const instruction: string = (body?.instruction ?? "").toString().slice(0, 500);
    const isLast: boolean = !!body?.is_last;

    if (!instruction.trim() || !stepBody.trim()) {
      return new Response(JSON.stringify({ error: "Missing instruction or body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("company_name, company_description, company_value_prop, company_tone")
      .eq("id", userData.user.id).maybeSingle();

    const systemPrompt = `Du förbättrar ETT mejl i en kall outreach-sekvens. Behåll grundbudskapet men följ instruktionen.

REGLER:
- Returnera bara den nya versionen (subject + body).
- Bodyn är HTML. Använd enkla taggar: <p>, <br>, <strong>, <em>, <a href="...">. Inga <html>, <head>, <body>, <style>, <script>, inga inline styles.
- Behåll befintliga <a href> exakt som de är (URL får inte ändras).
- Behåll befintliga <img>-taggar oförändrade.
- Max ~120 ord (räknas på text utan taggar). Kort och personligt.
- Använd ENDAST variabler: ${ALLOWED_VARS.join(", ")}.
- Inga [hakparenteser]. Inga andra placeholders.
${isLast ? "- Detta är sista steget — behåll det som mjuk break-up." : ""}
- Företagskontext: ${profile?.company_name ?? ""} – ${profile?.company_value_prop ?? profile?.company_description ?? ""}`;

    const userPrompt = `INSTRUKTION: ${instruction}

NUVARANDE ÄMNE: ${subject}
NUVARANDE BODY:
${stepBody}

Skriv en förbättrad version.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "improve_step",
            description: "Returnera förbättrat mejl",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
              },
              required: ["subject", "body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "improve_step" } },
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "no_credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = JSON.parse(args ?? "{}"); } catch {}

    let newBody = sanitizeBody(String(parsed.body ?? ""));
    newBody = newBody.replace(/\{\{\s*unsubscribe\s*\}\}/gi, "").trimEnd();
    if (isLast) {
      newBody = `${newBody}\n\nVill du inte höra mer? {{unsubscribe}}`;
    }

    return new Response(JSON.stringify({
      ok: true,
      subject: String(parsed.subject ?? "").slice(0, 200),
      body: newBody,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("improve-step error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
