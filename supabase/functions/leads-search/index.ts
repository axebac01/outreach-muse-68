import { createClient } from "npm:@supabase/supabase-js@2";
import { apolloSearch } from "../_shared/apollo.ts";
import { corsHeaders } from "../_shared/leadsCors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      page = 1,
      per_page = 25,
      q_keywords,
      person_titles,
      person_seniorities,
      organization_locations,
      organization_num_employees_ranges,
      organization_industry_tag_ids,
    } = body;

    const result = await apolloSearch({
      page: Math.max(1, Math.min(50, Number(page) || 1)),
      per_page: Math.max(1, Math.min(50, Number(per_page) || 25)),
      q_keywords: typeof q_keywords === "string" ? q_keywords : undefined,
      person_titles: Array.isArray(person_titles) ? person_titles.slice(0, 20) : undefined,
      person_seniorities: Array.isArray(person_seniorities) ? person_seniorities.slice(0, 10) : undefined,
      organization_locations: Array.isArray(organization_locations) ? organization_locations.slice(0, 20) : undefined,
      organization_num_employees_ranges: Array.isArray(organization_num_employees_ranges)
        ? organization_num_employees_ranges.slice(0, 10)
        : undefined,
      organization_industry_tag_ids: Array.isArray(organization_industry_tag_ids)
        ? organization_industry_tag_ids.slice(0, 10)
        : undefined,
    });

    // Apollo's mixed_people/api_search returns intentionally limited preview
    // data: only first_name, obfuscated last_name, title, company name, and
    // boolean "has_*" flags. Full data (email, full name, location, domain,
    // industry, size) requires a separate /people/match enrichment call.
    const previews = result.people.map((p) => {
      const obfuscated = p.last_name_obfuscated ?? "";
      const displayName = [p.first_name, obfuscated].filter(Boolean).join(" ").trim();
      return {
        provider_id: p.id,
        first_name: p.first_name,
        last_name_obfuscated: obfuscated,
        name: displayName,
        title: p.title ?? null,
        company: p.organization?.name,
        has_email: !!p.has_email,
        has_direct_phone: p.has_direct_phone === "Yes",
        has_location: !!(p.has_city || p.has_state || p.has_country),
        has_industry: !!p.organization?.has_industry,
        has_employee_count: !!p.organization?.has_employee_count,
        last_refreshed_at: p.last_refreshed_at ?? null,
      };
    });

    return new Response(
      JSON.stringify({ people: previews, pagination: result.pagination }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = (e as Error).message ?? "Unknown error";
    console.error("leads-search error:", msg);

    const isInaccessible =
      msg.includes("API_INACCESSIBLE") ||
      msg.includes("free plan") ||
      msg.includes("Apollo search failed (403)");

    if (isInaccessible) {
      return new Response(
        JSON.stringify({
          error: "apollo_plan_required",
          message:
            "Apollo-nyckeln är på gratisplan. Sökning kräver minst Apollo Basic ($49/mån). Uppgradera ditt Apollo-konto eller byt API-nyckel.",
          upgrade_url: "https://app.apollo.io/#/settings/plans/upgrade",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
