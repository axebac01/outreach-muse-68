## Multi-select på alla filter

### Vad ändras
Konvertera dessa fält från single-select till multi-select med chip/badge-UI (likt screenshotten):
- **Roller** (preset-roller — VD, Säljchef, …)
- **Senioritet** (Owner, C-suite, VP, …)
- **Bransch** (SaaS, IT-tjänster, …)
- **Antal anställda** (1–10, 11–50, …)
- **Locations** är redan komma-separerad text → behålls men visas som chips för konsekvens
- **Titlar (fritext)** är redan komma-separerad → visas som chips, ny rad läggs till med Enter eller komma

### UI-mönster
För varje filter en knapp som öppnar en `Popover` med en checkbox-lista (eller `Command` med sökruta för långa listor som bransch). I knappen visas en räknare `× N` när val finns, precis som i screenshotten ("Job Titles × 9"). Under fältet renderas valda chips med en X-knapp för att ta bort enskilt.

### State-modell (i `Leads.tsx`)
- `role: string` → `roles: string[]`
- `seniority: string` → `seniorities: string[]`
- `industry: string` → `industries: string[]`
- `employees: string` → `employeesRanges: string[]`
- `titles` (string) blir kvar internt men renderas/redigeras som chips
- `locations` (string) blir kvar internt men renderas/redigeras som chips

### Backend-anrop (`leads-search` body)
Bygg `mergedTitles` från fritext-chips + alla valda rollers `titles[]` (union, deduplicerad). Skicka:
- `person_titles: mergedTitles`
- `person_seniorities: seniorities`
- `organization_industry_tag_ids: industries`
- `organization_num_employees_ranges: employeesRanges`
- `organization_locations: locations.split(",")`

Allt skickas som arrays. Tomma fält utelämnas.

### Persistens & senaste sökningar
- `FILTERS_KEY` (localStorage) — utöka schemat med arrays. Lägg in en migrering: om gamla single-fält finns, läs in dem som 1-elements arrays vid mount.
- `lead_searches.filters` (DB) — `jsonb`, behöver inget schema-byte. `filters_hash` baseras på normaliserade arrays (sorterade) så samma uppsättning ger samma hash.
- `summarizeFilters` uppdateras: visar t.ex. "VD, Säljchef · C-suite, VP · Sweden · SaaS, IT".

### Återanvändbar komponent
Ny `src/components/leads/MultiSelectFilter.tsx`:
- Props: `label`, `options: {value, label}[]`, `value: string[]`, `onChange`, `searchable?: boolean`.
- Knapp visar `label` + räknare. Popover med checkbox-lista (Command-baserad om `searchable`).
- Används för Roller, Senioritet, Bransch, Anställda.

Och en mindre `ChipInput.tsx` för fritextfälten (titlar, locations) — Enter/komma lägger till chip, X tar bort.

### Filer som ändras
- `src/pages/Leads.tsx` — state, body-bygge, persistens, summarizeFilters, render.
- `src/components/leads/MultiSelectFilter.tsx` — ny.
- `src/components/leads/ChipInput.tsx` — ny.

### Inget annat berörs
Edge function `leads-search` är oförändrad (den tar redan arrays). Credits-logik, reveal-flöde, tabbar och senaste sökningar fungerar som idag.