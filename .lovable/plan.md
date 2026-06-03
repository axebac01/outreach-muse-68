## Problem
Apollo har deprecierat `mixed_people/search` för API-anrop och returnerar 422 med instruktion att byta till `mixed_people/api_search`.

## Åtgärd
Uppdatera `supabase/functions/_shared/apollo.ts`:

- Ändra URL i `apolloSearch` från `${APOLLO_BASE}/mixed_people/search` till `${APOLLO_BASE}/mixed_people/api_search`.
- Behåll allt övrigt (request-body, headers, paginering) oförändrat — den nya endpointen accepterar samma fält enligt Apollos dokumentation.

Inga andra filer påverkas. `leads-search` använder hjälpfunktionen direkt, så fixen rullar ut när edge function deployas.

## Verifiering
1. Deploya `leads-search`.
2. Kör en sökning från `/leads` i preview.
3. Kontrollera edge function-loggar — inget 422-fel, resultat returneras.