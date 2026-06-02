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
    });

    // Mask out anything sensitive — we only return preview data.
    const previews = result.people.map((p) => ({
      provider_id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      name: p.name,
      title: p.title,
      linkedin_url: p.linkedin_url,
      city: p.city,
      country: p.country,
      company: p.organization?.name,
      company_domain: p.organization?.primary_domain || p.organization?.website_url,
      industry: p.organization?.industry,
      company_size: p.organization?.estimated_num_employees,
    }));

    return new Response(
      JSON.stringify({ people: previews, pagination: result.pagination }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("leads-search error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
