## Två förbättringar på Leads-sidan

### 1. Bugg: "Markera 25" markerar bara 23 om några är köpta
**Orsak:** I `applyBulkSelect` (count-läge) tar vi `currentPagePeople.slice(0, target)` *efter* filtrering bort av redan avslöjade. Resultatet blir färre än önskat.

**Fix:** I count-läge — om antalet ofiltrerade nya på sidan är < target, anropa alltid `collectProviderIds(target)` så vi hämtar fler från nästa sida tills vi har exakt `target` *nya* (eller når totalen / 500-cappen).

Konkret ändring i `applyBulkSelect`:
```ts
const unrevealedOnPage = currentPagePeople.filter(p => !revealedById[p.provider_id]);
if (unrevealedOnPage.length >= target) {
  ids = unrevealedOnPage.slice(0, target).map(p => p.provider_id);
} else {
  ids = await collectProviderIds(target); // paginerar tills target nådd
}
```
`collectProviderIds` hoppar redan över redan-avslöjade, så ingen ändring behövs där.

### 2. Tre visningslägen ovanför träfflistan (Apollo-stil)
Tabbar ovanför listan, precis som screenshotten: **Total · Nya · Sparade**.

- **Total** — visar allt i nuvarande sökresultat (default, samma som idag).
- **Nya** — visar bara leads i nuvarande sida som *inte* finns i `marketplace_leads`.
- **Sparade** — visar bara leads i nuvarande sida som finns i `marketplace_leads` (med fullt namn/mejl direkt synligt).

**Räknare i tabbarna:**
- *Total*: `pagination.total_entries` (globalt för sökningen — samma siffra vi visar redan).
- *Sparade*: antal avslöjade på nuvarande sida (`Object.keys(revealedById).filter(id => pageIds.includes(id)).length`). Räknaren visar alltså "X av 25 på denna sida". Vi lägger en liten tooltip som förklarar.
- *Nya*: `pagination.total_entries − sparade-på-sidan` är missvisande globalt, så vi visar i stället antal nya på sidan. Konsekvent med "Sparade".

> Notering: Apollo har globala räknare för Net New / Saved eftersom de indexerar hela kontot. Vi har inte den datan globalt per sökning utan dyra extra-anrop, så vi håller räknarna sidoscopade och tydliga.

**Implementation:**
- Ny state `viewMode: "total" | "new" | "saved"`, default `"total"`. Sparas inte i URL/localStorage (sidlokal).
- Filtrera `search.data.people` i render utifrån `viewMode` och `revealedById` innan map.
- Tabb-UI: använd befintlig shadcn `Tabs` komponent, placerad direkt över "markera alla"-raden.
- Markera alla-checkboxen scopas till den filtrerade vyn (markerar bara de synliga, redan exklusive sparade).
- Bulk-popovern (25/sida/alla) är oförändrad — den arbetar alltid mot nya.

### Filer som ändras
- `src/pages/Leads.tsx` — bulk-fix + tabbar + filtrerad rendering.

Inget annat berörs (databas, edge functions, credits-logik).