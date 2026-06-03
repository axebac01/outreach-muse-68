## Mål
Spara senaste sökningarna per användare i databasen så de finns kvar över sessioner och enheter.

## Databas (ny migration)
Ny tabell `public.lead_searches`:
```
id              uuid pk default gen_random_uuid()
user_id         uuid not null  -- auth.uid()
filters         jsonb not null -- { titles, role, industry, locations, keywords, seniority, employees }
total_results   integer
filters_hash    text not null  -- md5 av normaliserad filters, för dedupe
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
unique (user_id, filters_hash)
index (user_id, updated_at desc)
```
GRANT SELECT/INSERT/UPDATE/DELETE till `authenticated`, ALL till `service_role`. RLS på, policies: `auth.uid() = user_id` för alla fyra kommandon. Trigger `set_updated_at` (finns redan).

## Frontend (`src/pages/Leads.tsx`)
- **Spara**: när `search.isSuccess`, anropa en `upsertRecentSearch(filters, totalResults)`:
  - Beräkna `filters_hash` (md5/sha av sorterad JSON) i klienten.
  - `upsert` på `(user_id, filters_hash)` → sätter `updated_at = now()` + `total_results`.
  - Hoppa över om alla filterfält är tomma.
- **Hämta**: React Query `["recent-searches"]` → `select * from lead_searches where user_id = auth.uid() order by updated_at desc limit 10`.
- **UI**: ny knapp **"Senaste sökningar"** (`History`-ikon) bredvid "Sök"/"Rensa". Öppnar `Popover` med listan:
  - Sammanfattning (t.ex. "VD · Sweden · SaaS"), antal träffar, relativ tid ("för 5 min sedan").
  - X-knapp per rad (delete-row), "Rensa historik" längst ner (delete-all-for-user).
- **Återställ**: klick → sätter alla filter-states, `page=1`, `searchTriggered=true`, stänger popover. React Query cachen återanvänds om färsk.

## Hjälpare
- `summarizeFilters(f)` → kort sträng.
- `formatRelative(ts)` → "nyss", "för X min sedan", "i går", "YYYY-MM-DD".
- `hashFilters(f)` → stabil hash av normaliserad/trimmad JSON.

## Inget annat ändras
Befintlig localStorage-baserad filter-persistens (`leads:filters:v1`) behålls för att återställa pågående session direkt. Bulk-select och credit-logik rörs inte.