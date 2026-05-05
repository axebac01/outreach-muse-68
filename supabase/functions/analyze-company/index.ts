import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const rawUrl: string = body?.url ?? "";
    if (!rawUrl || typeof rawUrl !== "string" || rawUrl.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = normalizeUrl(rawUrl);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await admin
      .from("profiles")
      .update({ company_url: url, company_scrape_status: "pending" })
      .eq("id", userId);

    // 1. Firecrawl scrape
    const fcResp = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "summary"],
        onlyMainContent: true,
      }),
    });

    if (!fcResp.ok) {
      const txt = await fcResp.text();
      console.error("Firecrawl failed", fcResp.status, txt);
      await admin
        .from("profiles")
        .update({ company_scrape_status: "failed" })
        .eq("id", userId);
      const reason = fcResp.status === 402 ? "no_credits" : "scrape_failed";
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const fcJson = await fcResp.json();
    const doc = fcJson.data ?? fcJson;
    const markdown: string = (doc?.markdown ?? "").slice(0, 8000);
    const summary: string = doc?.summary ?? "";
    const title: string = doc?.metadata?.title ?? "";

    // 2. AI structured output
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Du analyserar företagswebbplatser och returnerar koncisa, säljinriktade beskrivningar på svenska.",
          },
          {
            role: "user",
            content: `Page title: ${title}\n\nSummary: ${summary}\n\nMarkdown:\n${markdown}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "describe_company",
              description: "Return structured company info",
              parameters: {
                type: "object",
                properties: {
                  company_name: { type: "string" },
                  target_audience: { type: "string", description: "Vilka säljer de till" },
                  value_prop: { type: "string", description: "Vad säljer de / vilket värde" },
                  two_sentence_summary: {
                    type: "string",
                    description: "Beskriv företaget på 2 meningar ur ett säljperspektiv.",
                  },
                },
                required: ["company_name", "target_audience", "value_prop", "two_sentence_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "describe_company" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI failed", aiResp.status, txt);
      await admin.from("profiles").update({ company_scrape_status: "failed" }).eq("id", userId);
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: "ai_failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const aiJson = await aiResp.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try {
      parsed = JSON.parse(args ?? "{}");
    } catch {
      parsed = {};
    }

    const result = {
      company_name: parsed.company_name ?? title ?? "",
      company_target_audience: parsed.target_audience ?? "",
      company_value_prop: parsed.value_prop ?? "",
      company_description: parsed.two_sentence_summary ?? summary ?? "",
      company_scrape_status: "done",
    };

    await admin.from("profiles").update(result).eq("id", userId);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-company error", e);
    return new Response(
      JSON.stringify({
        ok: false,
        fallback: true,
        reason: "unknown",
        message: e instanceof Error ? e.message : "Unknown",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
