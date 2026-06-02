# Mål

Göra `/inbound` till en snygg "Kommer snart"-sida som teasar funktionen, och dölja den faktiska inbound-funktionaliteten tills vi lanserar.

## Ändringar

### `src/pages/Inbound.tsx`
Ersätt hela sidans innehåll med en coming soon-vy inuti `<Layout>`:

- Stor ikon (Radar / Building2 / Eye från lucide) med subtil glow/gradient.
- Rubrik: "Inbound — kommer snart"
- Underrubrik som förklarar konceptet kort: "Se vilka företag som besöker din hemsida — även om de aldrig fyller i ett formulär."
- 3 feature-cards i grid (ikon + titel + 1 mening):
  1. **Företagsidentifiering** — Identifiera B2B-besökare via IP och berika med bransch, storlek och kontaktytor.
  2. **Lead-matchning** — Få notiser när dina befintliga leads återbesöker sajten, så du kan följa upp i rätt ögonblick.
  3. **Smart prioritering** — Se vilka sidor besökaren tittade på och hur engagerad signalen är.
- "Notifiera mig"-knapp (disabled eller toast "Vi hör av oss när det är dags") — håll det enkelt: en knapp som visar en toast "Tack! Vi meddelar dig när Inbound släpps." Ingen DB-skrivning.
- Liten badge överst: "Beta · Under utveckling"

Bevara filen — `Inbound.tsx` finns kvar, bara innehållet byts. Övriga inbound-relaterade sidor/komponenter rörs inte (tracking sites etc. nås från andra ställen).

### Navigation
Inga ändringar — länken till `/inbound` finns kvar i menyn och leder till denna teaser. Det är vad användaren vill ("dölj funktionerna", inte länken).

### Filer som inte ändras
- Routes i `App.tsx` (sidan finns kvar på samma path).
- Edge functions, tabeller, andra inbound-relaterade hooks (de finns kvar för framtida lansering, bara dolda från UI).
- `TrackingSettings.tsx` och andra sidor som inte är `/inbound`.

## Design

- Använd existerande semantiska tokens (primary, muted, card, border).
- Centrerad layout, max-w-3xl, generös padding.
- Subtle gradient eller blur-effekt bakom ikonen för att lyfta sidan.
- Inga nya beroenden.

## Verifiering

1. Navigera till `/inbound` → ser coming soon-vyn, inga gamla widgets/listor. ✅
2. Klick på "Notifiera mig" → toast visas. ✅
3. Inga konsolfel. ✅