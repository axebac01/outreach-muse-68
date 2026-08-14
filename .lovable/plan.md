# Alla leads syns, inte bara 1000

## Vad som faktiskt hänt

Alla dina leads finns i databasen: kampanjen Insynia har **4210 leads**. Inget tak har kapat importen.

Problemet är visningen: databasens API returnerar max 1000 rader per anrop, och appen hämtar bara ett anrop. Därför står det "Leads (1000)". Samma tak påverkar statistiken (skickat/schemalagt per lead), som räknas på max 1000 rader och därför kan visa för låga siffror i stora kampanjer.

## Vad som byggs

1. **Korrekt antal** — rubriken visar det verkliga antalet leads (hämtas som en ren räkning, inte genom att räkna raderna i listan).
2. **Hämta allt** — listan hämtas i block om 1000 tills alla rader är med, så inget saknas.
3. **Paginerad tabell** — istället för att rendera 4000+ rader på en gång visas t.ex. 50 per sida med sidnavigering och "Visar 1–50 av 4210". Statusfiltret gäller hela listan.
4. **Rätt statistik** — även utskicksstatistiken hämtas i block, så räknarna stämmer för stora kampanjer.
5. **Tydlig import-återkoppling** — efter import visas "Importerade X leads (Y dubbletter/ogiltiga hoppades över)" så man ser exakt vad som gick in.

## Teknisk detalj

- `src/hooks/useSequence.ts`: `useSequenceLeads` och `useSequenceSendStats` får en paginerande hämtning (`.range(from, to)` i loop) plus separat `count: "exact", head: true` för totalen.
- `src/components/campaign/LeadsTab.tsx`: rubriken använder totalen, tabellen får klientpaginering (sida/sidstorlek) och en rad med "Visar X–Y av Z".
- Inga databasändringar behövs.
