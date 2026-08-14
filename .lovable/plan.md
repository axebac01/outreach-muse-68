# Färre obligatoriska fält när man skapar kampanj

## Problem
I dag måste man fylla i namn, målgrupp, produkt, erbjudande och ton innan en kampanj kan skapas — både på sidan "Skapa kampanj" och i snabbdialogen från Leads. Fälten används inte av AI-generatorn vid skapandet (den läser i stället företagsprofilen från onboardingen), så kravet skapar friktion utan nytta just där.

## Vad som ändras

### 1. Bara namn är obligatoriskt
- På `/campaign/new` och i snabbdialogen "Skapa ny kampanj" blir målgrupp, produkt, erbjudande och ton frivilliga.
- Fälten samlas under en hopfällbar sektion "Kampanjkontext (valfritt)" med texten: "Fyll i om du vill — vi frågar igen när du skriver sekvensen med AI."
- Knappen blir aktiv så fort namnet är ifyllt.

### 2. Frågan kommer i stället när AI ska skriva sekvensen
- I dialogen "Skriv sekvens med AI" visas en sektion "Om kampanjen" med målgrupp, produkt/erbjudande och ton.
- Fält som redan är ifyllda på kampanjen förifylls; saknas de visas de tomma med förklaringen att AI:n skriver bättre mejl med den här informationen.
- Målgrupp och erbjudande krävs här (det är där de faktiskt gör nytta) — ton är frivillig och faller tillbaka på företagsprofilens ton.
- När man genererar sparas värdena tillbaka på kampanjen, så man slipper fylla i dem igen nästa gång, och de skickas med i underlaget till AI:n.

### 3. Översikt
- I kampanjens översiktsflik markeras tomma kontextfält med en diskret "Saknas"-hint i stället för att se ut som ett fel.

## Teknisk detalj
- `src/pages/CreateCampaign.tsx` och `src/components/leads/CreateCampaignInlineDialog.tsx`: ta bort `required` på allt utom namn, lägg kontextfälten i en `Collapsible`, skicka tomma strängar som `null`.
- `src/components/campaign/AiWriteSequenceDialog.tsx`: ny props för kampanjens kontext, nya fält i formuläret, validering av målgrupp/erbjudande, spara via `useUpdateCampaign` och lägg med kontexten i `goal`-underlaget till `generate-sequence`.
- `src/components/campaign/SequenceTab.tsx`: skickar vidare kampanjobjektet till AI-dialogen.
- Inga databas- eller edge function-ändringar behövs (kolumnerna tillåter redan tomma värden och AI:n läser företagsprofilen).
