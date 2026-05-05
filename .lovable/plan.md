# Mockdata med blur + tomstate-overlay på Analys

Istället för att visa en tom `EmptyState` när användaren inte har någon data, rendera hela analys-dashboarden med **fejkdata** i bakgrunden, lägg på en `blur(6px)` + lätt opacity, och visa ett centrerat overlay-kort med "Ingen data ännu" och knapp **Till kampanjer** (länkar till `/dashboard`).

## Ändringar i `src/pages/Analytics.tsx`

1. **Generera mockdata** (i en `useMemo` kopplad till `range`) — deterministisk men varierande:
   - `sends`: 40–70 per dag i vald period, status mestadels `"sent"`, ~5% `"failed"`. Fördelade över 4 påhittade `sequence_id`.
   - `leads`: ~14% av skickade markeras `"replied"`, plus en mängd `"active"` så `totalLeads` ser realistiskt ut.
   - `sequences`: 4 påhittade kampanjnamn (ex. "Q4 SaaS-VD:ar", "Nordic Fintech", "Tech Founders", "Marketing Leaders"), 2 `active` / 2 `paused`.
   - `unsubscribes`: 23 st.

2. **`displayData = hasAnyData ? data : mockData`** — alla `useMemo` (stats, series, topCampaigns) kör mot `displayData` istället för `data`.

3. **Render** — ta bort nuvarande `else if (!hasAnyData)`-grenen. Wrappa hela KPI/grafer-blocket i en `<div className="relative">`. När `!hasAnyData`:
   - Inner content får `filter blur-md opacity-70 pointer-events-none select-none` och `aria-hidden`.
   - Lägg över ett absolut positionerat overlay (`absolute inset-0 grid place-items-center z-10`) med ett vitt kort: ikon, h2 "Ingen data ännu", text "Starta en kampanj för att se siffror här." och primärknapp "Till kampanjer" → `/dashboard`. Kortet använder `bg-card/95 backdrop-blur-sm border shadow-lg rounded-xl p-8 max-w-sm text-center`.

4. **Tidsfilter-knapparna** stannar interaktiva (overlayn ligger bara över själva data-blocket, inte över headern).

5. **i18n** — använd befintliga nycklar `analytics.emptyTitle`, `analytics.emptyDesc`, `analytics.emptyAction`. Inga nya strängar.

Inga andra filer berörs.
