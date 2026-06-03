## Bakgrund

Apollo har bytt från `mixed_people/search` till `mixed_people/api_search`. Den nya endpointen returnerar **mycket mindre data per person** än vad vår kod antar:

**Vad nya endpointen faktiskt returnerar per person:**
- `id`, `first_name`
- `last_name_obfuscated` (t.ex. `"Hu***n"`) — **inte fullt efternamn**
- `title`, `last_refreshed_at`
- `has_email`, `has_city`, `has_state`, `has_country` (booleans)
- `has_direct_phone` (string: `"Yes"` / `"Maybe..."`)
- `organization`: bara `name` + `has_*` flaggor (ingen domän, ingen industri, ingen website_url)

**Vad den INTE returnerar (som vår kod förväntar sig):**
- Fullt `last_name`
- `email`, `linkedin_url`
- `city`, `country` (bara booleans om de finns)
- `organization.website_url`, `primary_domain`, `industry`, `estimated_num_employees`

**Response-format:** `{ total_entries, people: [...] }` — inget `pagination`-objekt (vår kod läser `data.pagination` som alltid blir undefined).

**Credits:** Sökningen är gratis (rate-limited, inte credit-baserad). Credits dras först vid `people/match` (enrichment).

## Konsekvens

Lead-listan visar idag förmodligen mest tomma fält (efternamn, stad, land, domän, branch) eftersom datan inte finns i svaret. Paginering är trasig.

## Plan

### 1. Uppdatera `_shared/apollo.ts`
- Justera `ApolloPersonPreview` så den matchar faktisk respons:
  - `last_name_obfuscated` istället för `last_name`
  - `has_email`, `has_direct_phone`, `has_city`, `has_state`, `has_country` flaggor
  - `organization` med bara `name` + `has_*` flaggor
- Ta bort fält som inte finns (linkedin_url, city, country, website_url, industry, estimated_num_employees)
- Returnera korrekt paginering: bygg själv `{ page, per_page, total_entries, total_pages }` från `total_entries` + request-params (endpointen returnerar inte `pagination`)

### 2. Uppdatera `leads-search` edge function
- Mappa preview-fälten korrekt till frontend-formatet
- Skicka med flaggor (`has_email`, `has_direct_phone`) så UI kan visa indikatorer
- Visa `first_name + last_name_obfuscated` som namn (t.ex. "Andrew Hu***n")

### 3. Uppdatera Leads-UI (`/leads`)
- Visa obfuskerat namn tills personen är enrichad
- Visa badges/ikoner för "Email tillgänglig", "Direktnummer tillgängligt" baserat på flaggor
- Dölj eller markera tomma fält (city, country, domain, industry) som "Lås upp med enrichment"
- Lägg till en tydlig **"Enricha"-knapp** per lead som triggar `people/match` (drar credits) och fyller i fullt namn + email

### 4. Enrichment-flow (separat edge function eller endpoint)
- Befintliga `apolloMatch` finns redan i `_shared/apollo.ts` — exponera den via en `leads-enrich` edge function
- Vid lyckad enrichment: spara fullständig data i `leads`-tabellen
- Visa tydlig confirmation i UI **innan** enrichment körs (eftersom det drar credits)

### 5. Dokumentation i UI
- Liten info-text i Leads-vyn: "Sökning är gratis. Att låsa upp email/telefon drar 1 credit per kontakt från ditt Apollo-konto."

## Teknisk detalj

Inga schema-ändringar i databasen krävs i steg 1–3. Steg 4 kan kräva en kolumn `enriched_at` på `leads`-tabellen om vi vill tracka vilka som är enrichade (kan göras i separat migration).

## Vad jag INTE rör

- Sökfilter (titles, seniorities, locations, industries) — de fungerar oförändrat
- Apollo-anrop till `organizations/search` om det finns separat
- Övriga edge functions

## Frågor till dig

1. Vill du att jag bygger **både** steg 1–3 (visa obfuskerat + flaggor) och steg 4 (enrichment-knapp) i samma omgång, eller bara steg 1–3 nu så vi får sökningen rättad först?
2. Ska enrichment kräva en bekräftelse-dialog ("Detta drar 1 credit") innan den körs?
