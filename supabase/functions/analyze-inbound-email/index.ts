import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/oauth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You analyze replies to cold outreach emails. Output strictly via the provided tool.

Sentiment definitions:
- positive: open to dialog, asks a question, requests info/meeting, shows interest
- negative: not interested, hostile, "remove me", clear no
- neutral: ambiguous; informational without intent
- auto_reply: out-of-office, vacation responder, "I am away" auto messages
- unsubscribe_request: explicitly asks to be removed / not contacted

Category definitions: interested, not_interested, question, meeting_request, objection, out_of_office, wrong_person, other.

Language: ISO 639-1 (sv, en, no, da, fi, de, fr, es, it, nl, pt, …) detected from the inbound email body.

needs_reply = true ONLY when sentiment is positive OR neutral and a human reply would actually move the conversation forward (a question, an objection that can be addressed, a meeting request to confirm). For auto_reply/unsubscribe_request/negative without question → false.

suggested_reply rules (only when needs_reply=true):
- Same language as the email
- Concise (max ~80 words), warm, professional
- Address the specific question or next step
- Do NOT include greeting line repeated from prior email and do NOT include a signature (the UI adds one)
- Do NOT include subject line, just the body
- Match the user's product/value prop where relevant`;

interface AnalysisResult {
  sentiment: string;
  category: string;
  language: string;
  needs_reply: boolean;
  suggested_reply?: string;
}

async function analyzeWithAI(opts: {
  inboundBody: string;
  inboundFrom: string;
  subject: string;
  priorOutbound: { body: string; sent_at: string | null }[];
  userContext: { sender_name: string | null; company_name: string | null; company_value_prop: string | null; company_tone: string | null };
}): Promise<AnalysisResult> {
  const userMsg = [
    `## Last outbound emails from us (most recent last):`,
    ...(opts.priorOutbound.length === 0
      ? ["(none in this thread)"]
      : opts.priorOutbound.map((m, i) => `--- Outbound #${i + 1} ---\n${(m.body || "").slice(0, 1500)}`)),
    ``,
    `## Sender info`,
    `Our company: ${opts.userContext.company_name ?? "(unknown)"}`,
    `Value prop: ${opts.userContext.company_value_prop ?? "(unknown)"}`,
    `Tone: ${opts.userContext.company_tone ?? "professional, friendly"}`,
    `Sender name: ${opts.userContext.sender_name ?? "(unknown)"}`,
    ``,
    `## Inbound reply to analyze`,
    `From: ${opts.inboundFrom}`,
    `Subject: ${opts.subject}`,
    `Body:`,
    (opts.inboundBody || "").slice(0, 4000),
  ].join("\n");

  const body = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
    tools: [{
      type: "function",
      function: {
        name: "analyze_email",
        description: "Return structured analysis of the inbound email",
        parameters: {
          type: "object",
          properties: {
            sentiment: { type: "string", enum: ["positive", "negative", "neutral", "auto_reply", "unsubscribe_request"] },
            category: { type: "string", enum: ["interested", "not_interested", "question", "meeting_request", "objection", "out_of_office", "wrong_person", "other"] },
            language: { type: "string", description: "ISO 639-1 code" },
            needs_reply: { type: "boolean" },
            suggested_reply: { type: "string", description: "Reply body in same language, no signature" },
          },
          required: ["sentiment", "category", "language", "needs_reply"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "analyze_email" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit (429): för många AI-förfrågningar, försök igen om en stund.");
    if (resp.status === 402) throw new Error("Inga AI-credits kvar (402). Lägg till credits i workspace-inställningar.");
    throw new Error(`AI gateway ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const json = await resp.json();
  const call = json?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("AI returnerade inget verktygsanrop");
  const parsed = JSON.parse(call.function.arguments) as AnalysisResult;
  if (!parsed.sentiment || !parsed.category || !parsed.language) {
    throw new Error("AI-svaret saknar obligatoriska fält");
  }
  return parsed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { message_id, force } = await req.json();
    if (!message_id) {
      return new Response(JSON.stringify({ error: "message_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: msg, error: msgErr } = await admin
      .from("email_messages")
      .select("*")
      .eq("id", message_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (msgErr || !msg) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg.direction !== "inbound") {
      return new Response(JSON.stringify({ error: "Only inbound messages can be analyzed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg.ai_analyzed_at && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "already_analyzed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch prior outbound in same thread
    const { data: priorOutbound } = await admin
      .from("email_messages")
      .select("body_text, body_html, sent_at")
      .eq("user_id", msg.user_id)
      .eq("email_account_id", msg.email_account_id)
      .eq("thread_key", msg.thread_key)
      .eq("direction", "outbound")
      .order("sent_at", { ascending: true })
      .limit(5);

    const { data: account } = await admin
      .from("email_accounts").select("sender_name, display_name").eq("id", msg.email_account_id).maybeSingle();

    const { data: profile } = await admin
      .from("profiles").select("full_name, company_name, company_value_prop, company_tone").eq("id", msg.user_id).maybeSingle();

    const inboundBody = msg.body_text || (msg.body_html ? msg.body_html.replace(/<[^>]+>/g, " ") : "") || msg.snippet || "";

    let result: AnalysisResult;
    try {
      result = await analyzeWithAI({
        inboundBody,
        inboundFrom: msg.from_address,
        subject: msg.subject ?? "",
        priorOutbound: (priorOutbound ?? []).map((m: any) => ({
          body: m.body_text || (m.body_html ? m.body_html.replace(/<[^>]+>/g, " ") : ""),
          sent_at: m.sent_at,
        })),
        userContext: {
          sender_name: account?.sender_name ?? account?.display_name ?? profile?.full_name ?? null,
          company_name: profile?.company_name ?? null,
          company_value_prop: profile?.company_value_prop ?? null,
          company_tone: profile?.company_tone ?? null,
        },
      });
    } catch (aiErr: any) {
      const errMsg = aiErr?.message ?? "AI-analys misslyckades";
      await admin.from("email_messages").update({
        ai_analysis_error: errMsg.slice(0, 500),
        ai_analyzed_at: new Date().toISOString(),
      }).eq("id", message_id);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggested = result.needs_reply ? (result.suggested_reply ?? null) : null;

    await admin.from("email_messages").update({
      sentiment: result.sentiment,
      category: result.category,
      language: result.language,
      suggested_reply: suggested,
      ai_analyzed_at: new Date().toISOString(),
      ai_analysis_error: null,
    }).eq("id", message_id);

    // Mirror onto thread
    await admin.from("email_threads").update({
      last_sentiment: result.sentiment,
      last_category: result.category,
    })
      .eq("email_account_id", msg.email_account_id)
      .eq("thread_key", msg.thread_key);

    return new Response(JSON.stringify({ ok: true, ...result, suggested_reply: suggested }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("analyze-inbound-email error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
