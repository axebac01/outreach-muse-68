// Apollo.io API client. Docs: https://apolloio.github.io/apollo-api-docs/
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

export interface ApolloPersonPreview {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  linkedin_url?: string;
  city?: string;
  country?: string;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
    industry?: string;
    estimated_num_employees?: number;
  };
}

export async function apolloSearch(params: ApolloSearchParams): Promise<{
  people: ApolloPersonPreview[];
  pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
}> {
  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "X-Api-Key": getApiKey(),
      accept: "application/json",
    },
    body: JSON.stringify({
      page: params.page ?? 1,
      per_page: Math.min(params.per_page ?? 25, 50),
      ...(params.q_keywords && { q_keywords: params.q_keywords }),
      ...(params.person_titles?.length && { person_titles: params.person_titles }),
      ...(params.person_seniorities?.length && { person_seniorities: params.person_seniorities }),
      ...(params.organization_locations?.length && { organization_locations: params.organization_locations }),
      ...(params.organization_num_employees_ranges?.length && {
        organization_num_employees_ranges: params.organization_num_employees_ranges,
      }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo search failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return {
    people: data.people ?? [],
    pagination: data.pagination ?? { page: 1, per_page: 25, total_entries: 0, total_pages: 0 },
  };
}

export interface ApolloEnrichedPerson extends ApolloPersonPreview {
  email?: string;
  email_status?: string;
  phone_numbers?: { raw_number?: string; sanitized_number?: string }[];
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
