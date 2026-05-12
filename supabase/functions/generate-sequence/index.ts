import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_VARS = [
  "first_name",
  "last_name",
  "full_name",
  "company",
  "role",
  "email",
  "phone",
  "sender_name",
  "sender_email",
  "sender_signature",
  "unsubscribe",
];

function sanitizeBody(text: string): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (m, key: string) =>
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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sequenceId: string = body?.sequence_id ?? "";
    const goal: string = (body?.goal ?? "").toString().slice(0, 1000);
    const stepCount: number = Math.max(2, Math.min(6, Number(body?.step_count) || 4));
    const tone: string = (body?.tone ?? "").toString().slice(0, 100);

    if (!sequenceId || !goal.trim()) {
      return new Response(JSON.stringify({ error: "Missing sequence_id or goal" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select(
        "company_name, company_description, company_target_audience, company_value_prop, company_industry, company_tone, company_key_offerings, company_pain_points, company_proof_points, full_name",
      )
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile?.company_description && !profile?.company_value_prop) {
      return new Response(
        JSON.stringify({ error: "missing_company", message: "Slutför onboardingen först." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: leads } = await userClient
      .from("sequence_leads")
      .select("full_name, first_name, role, company")
      .eq("sequence_id", sequenceId)
      .limit(20);

    const leadCompanies = Array.from(
      new Set((leads ?? []).map((l) => l.company).filter(Boolean)),
    ).slice(0, 10);
    const leadRoles = Array.from(
      new Set((leads ?? []).map((l) => l.role).filter(Boolean)),
    ).slice(0, 10);

    const finalTone = tone || profile.company_tone || "professionell men personlig";

    // Simple language detection from company description
    const desc = (profile.company_description ?? "") + " " + (profile.company_value_prop ?? "");
    const swedishHits = (desc.match(/\b(och|att|för|vi|är|med|som|på|den|det)\b/gi) ?? []).length;
    const englishHits = (desc.match(/\b(and|the|for|we|are|with|that|our|you|your)\b/gi) ?? []).length;
    const lang = swedishHits >= englishHits ? "svenska" : "engelska";

    const systemPrompt = `Du är en världsklass-expert på kalla mejlsekvenser och B2B-säljkampanjer. Du skriver korta, personliga och konverterande mejl på ${lang.toUpperCase()}.

REGLER (kritiska):
- Returnera EXAKT ${stepCount} steg.
- Steg 1 har wait_days = 0. Övriga steg 2–4 wait_days vardera.
- Varje mejl max ~120 ord, helst kortare. Inga floskler.
- Steg 1 = personlig hook + tydligt värde + mjuk CTA (fråga, inte boka-möte-direkt).
- Mellansteg = ny vinkel, social proof, eller en konkret fråga.
- Sista steget = mjuk break-up ("vill du att jag slutar höra av mig?").
- Ämnesrad max 6 ord, lowercase känns mer personligt. Steg 2+ kan ha tom ämnesrad (= svar i samma tråd).
- Sista stegets body MÅSTE innehålla {{unsubscribe}} på egen rad i slutet.
- Bodyn är HTML. Använd <p> för stycken, <br> för radbrytningar, <strong>/<em> för betoning. Inga inline styles, inga <html>/<body>/<style>/<script>.
- Använd ENBART dessa variabler (med {{...}}-syntax): ${ALLOWED_VARS.join(", ")}.
- Inga andra placeholders, inga [hakparenteser], inga "Hi {first}".
- Skriv på ${lang}. Ton: ${finalTone}.`;

    const userPrompt = `KAMPANJMÅL: ${goal}

OM AVSÄNDARE / FÖRETAG:
Namn: ${profile.company_name ?? "(okänt)"}
Bransch: ${profile.company_industry ?? "(okänt)"}
Beskrivning: ${profile.company_description ?? ""}
Värdeerbjudande: ${profile.company_value_prop ?? ""}
Målgrupp (deras kunder): ${profile.company_target_audience ?? ""}
Erbjudanden: ${(profile.company_key_offerings ?? []).join(", ") || "(saknas)"}
Smärtpunkter de löser: ${(profile.company_pain_points ?? []).join(", ") || "(saknas)"}
Bevis/proof: ${(profile.company_proof_points ?? []).join(", ") || "(saknas)"}
Avsändarens namn: ${profile.full_name ?? "(okänt)"}

LEADS I KAMPANJEN (${leads?.length ?? 0} st):
Företag-exempel: ${leadCompanies.join(", ") || "(inga)"}
Roller: ${leadRoles.join(", ") || "(inga)"}
${(leads?.length ?? 0) === 0 ? "Inga leads ännu — håll mejlen generella mot målgruppen ovan." : ""}

Generera kampanjen nu.`;

    const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
    const model = gateway("google/gemini-3-flash-preview");
    let parsed: any = {};

    try {
      const { output } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        output: Output.object({
          schema: z.object({
            steps: z.array(z.object({
              step_order: z.number(),
              subject: z.string(),
              body: z.string(),
              wait_days: z.number(),
            })).min(stepCount).max(stepCount),
          }),
        }),
      });
      parsed = output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("AI gateway error", message);

      if (message.includes("429")) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (message.includes("402")) {
        return new Response(JSON.stringify({ error: "no_credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rawSteps: any[] = Array.isArray(parsed.steps) ? parsed.steps : [];
    if (rawSteps.length === 0) {
      return new Response(JSON.stringify({ error: "empty_response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unsubFooter = lang === "engelska"
      ? "Not interested? {{unsubscribe}}"
      : "Vill du inte höra mer? {{unsubscribe}}";

    const steps = rawSteps
      .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
      .map((s, i) => {
        let body = sanitizeBody(String(s.body ?? ""));
        const isLast = i === rawSteps.length - 1;
        // Always strip any unsubscribe mention then re-append on last step (guaranteed)
        body = body.replace(/\{\{\s*unsubscribe\s*\}\}/gi, "").trimEnd();
        if (isLast) {
          body = `${body}<p>${unsubFooter}</p>`;
        }
        return {
          step_order: i,
          subject: String(s.subject ?? "").slice(0, 200),
          body,
          wait_days: i === 0 ? 0 : Math.max(1, Math.min(30, Number(s.wait_days) || 3)),
        };
      });

    return new Response(JSON.stringify({ ok: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-sequence error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
