# Snyggare företagssammanfattning i onboardingens sista steg

## Problemet
Sista steget skriver ut hela AI-analysen som en enda gigantisk rubrik i 4xl. När beskrivningen är lång blir det en vägg av text, och sammanslagningen av målgrupp + värdeerbjudande ger trasig svenska ("... att Erbjuder en allt-i-ett-lösning ...") plus dubbla punkter ("..").

## Vad som ändras (endast presentation)

1. **Hierarki istället för tre lika stora rader**
   - "Vi hittade CRMdata." blir rubriken (stor, men något mindre än idag).
   - Beskrivningen flyttas ner till brödtext i läsbar storlek, centrerad med maxbredd.
   - "Vi skriver mejl som låter som att de kommer från er." blir en avslutande, dämpad rad ovanför knappen.

2. **Företagsprofil som kort istället för löptext**
   - Ett kort med logotyp + domän i toppen.
   - Två tydliga rader: **Målgrupp** och **Det ni erbjuder**, var för sig i stället för en hopslagen mening. Det tar bort grammatikproblemet helt.
   - Faller tillbaka på `company_description` som en enda rad om målgrupp/värdeerbjudande saknas.

3. **Textstädning**
   - Trimma bort avslutande punkt/dubbelpunkt innan text sätts ihop.
   - Gemen första bokstav i värdeerbjudandet när det sitter efter "att".
   - Klipp orimligt långa beskrivningar med ellips (visas i sin helhet först i inställningarna).

4. **Behåll känslan**
   - Samma stegvisa fade/slide-animation, bara på färre och mindre element.
   - Samma CTA "Perfekt {namn}, kör igång".

## Teknisk detalj
Allt sker i `FinalStep` i `src/pages/Onboarding.tsx` (raderna kring 656–714). Ingen ändring av datainhämtning, scrape-logik eller databas. Semantiska tokens används (`bg-card`, `text-muted-foreground`), inga hårdkodade färger.
