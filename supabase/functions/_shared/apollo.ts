// Apollo.io API client. Docs: https://docs.apollo.io/reference/people-api-search
const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getApiKey(): string {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) throw new Error("APOLLO_API_KEY is not configured");
  return key;
}

export interface ApolloSearchParams {
  page?: number;
  per_page?: number;
  q_keywords?: string;
  person_titles?: string[];
  person_seniorities?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  organization_industry_tag_ids?: string[];
}

/**
 * Preview returned by `mixed_people/api_search`.
 *
 * IMPORTANT: This endpoint is intentionally limited — it does NOT return
 * the full last name, email, linkedin_url, city, country, company domain,
 * industry, or employee count. Only boolean "has_*" flags indicate whether
 * those fields exist on the underlying record. Full data requires a separate
 * `people/match` enrichment call (which costs Apollo credits).
 */
export interface ApolloPersonPreview {
  id: string;
  first_name?: string;
  last_name_obfuscated?: string; // e.g. "Hu***n"
  title?: string | null;
  last_refreshed_at?: string;
  has_email?: boolean;
  has_city?: boolean;
  has_state?: boolean;
  has_country?: boolean;
  /** Returns "Yes" if a direct dial is available, "Maybe: ..." otherwise. */
  has_direct_phone?: string;
  organization?: {
    name?: string;
    has_industry?: boolean;
    has_phone?: boolean;
    has_city?: boolean;
    has_state?: boolean;
    has_country?: boolean;
    has_zip_code?: boolean;
    has_revenue?: boolean;
    has_employee_count?: boolean;
  };
}

export async function apolloSearch(params: ApolloSearchParams): Promise<{
  people: ApolloPersonPreview[];
  pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
}> {
  const perPage = Math.min(params.per_page ?? 25, 100);
  const page = params.page ?? 1;

  const res = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "X-Api-Key": getApiKey(),
      accept: "application/json",
    },
    body: JSON.stringify({
      page,
      per_page: perPage,
      ...(params.q_keywords && { q_keywords: params.q_keywords }),
      ...(params.person_titles?.length && { person_titles: params.person_titles }),
      ...(params.person_seniorities?.length && { person_seniorities: params.person_seniorities }),
      ...(params.organization_locations?.length && { organization_locations: params.organization_locations }),
      ...(params.organization_num_employees_ranges?.length && {
        organization_num_employees_ranges: params.organization_num_employees_ranges,
      }),
      ...(params.organization_industry_tag_ids?.length && {
        organization_industry_tag_ids: params.organization_industry_tag_ids,
      }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo search failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const totalEntries: number = typeof data.total_entries === "number" ? data.total_entries : 0;
  const totalPages = perPage > 0 ? Math.ceil(totalEntries / perPage) : 0;
  return {
    people: (data.people ?? []) as ApolloPersonPreview[],
    pagination: { page, per_page: perPage, total_entries: totalEntries, total_pages: totalPages },
  };
}

export interface ApolloEnrichedPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  linkedin_url?: string;
  city?: string;
  country?: string;
  phone_numbers?: { raw_number?: string; sanitized_number?: string }[];
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
    industry?: string;
    estimated_num_employees?: number;
  };
}

export async function apolloMatch(personId: string): Promise<ApolloEnrichedPerson | null> {
  const res = await fetch(`${APOLLO_BASE}/people/match?reveal_personal_emails=false&reveal_phone_number=false`, {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "X-Api-Key": getApiKey(),
      accept: "application/json",
    },
    body: JSON.stringify({ id: personId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo match failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.person ?? null;
}
