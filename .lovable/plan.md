# Bara en person per företag

En ny inställning på Leads-fliken i kampanjen: **Mejla bara en person per företag**. När den är på mejlas högst en kontakt per företag när kampanjen startar — resten ligger kvar i listan, tydligt markerade som "Överhoppad (dubblett)".

## Så fungerar det

1. Överst på Leads-fliken läggs ett kort med en switch: "Mejla bara en person per företag" med kort förklaring och en live-räknare: "4 210 leads · 1 380 företag · 2 830 hoppas över".
2. Gruppering: i första hand e-postdomänen (t.ex. `@crmdata.se`), annars domänen från webbplats-fältet, annars normaliserat företagsnamn. Gratisdomäner (gmail, hotmail, outlook m.fl.) grupperas aldrig ihop — de räknas som egna företag.
3. Vem behålls: den med "bäst" roll (VD, grundare, C-nivå, chef, head of, ägare) — annars den som importerades först. Deterministiskt, så samma resultat varje gång.
4. Vid start av kampanjen schemaläggs bara den valda personen per företag. Övriga leads får status `skipped_duplicate` och mejlas aldrig — förrän du stänger av inställningen och startar om, då tas de med.
5. I leadslistan får överhoppade rader en grå badge "Dubblett" och det går att filtrera på dem i statusfiltret. Redan skickade leads påverkas aldrig retroaktivt.
6. Inställningen går bara att ändra medan kampanjen är utkast/pausad; är den aktiv visas switchen låst med förklaring.

## Teknisk plan

**Databas (migration)**
- `sequences.one_per_company boolean not null default false`.
- Tillåt `skipped_duplicate` i statusvärdet för `sequence_leads` (uppdatera ev. CHECK-constraint).

**Backend**
- `supabase/functions/launch-sequence/index.ts`: hämta även `company`, `website`, `role` för pending leads. Om `seq.one_per_company` — gruppera enligt regeln ovan, välj vinnare per grupp, schemalägg bara dessa och sätt övriga pending-leads till `skipped_duplicate`. Svaret utökas med `skipped_duplicates`-antal så UI kan visa "1 380 mejlas · 2 830 överhoppade".
- Gemensam grupperings-/urvalslogik läggs i `supabase/functions/_shared/companyDedupe.ts` och speglas av en frontend-hjälpare `src/lib/companyDedupe.ts` (samma regler) för förhandsräknaren.

**Frontend**
- `src/components/campaign/LeadsTab.tsx`: nytt inställningskort med switch + räknare (beräknas klientsidan från redan hämtade leads), badge och statusfilter för dubbletter.
- `src/hooks/useSequence.ts`: mutation för att uppdatera `one_per_company` på sekvensen, samt `website`/`role` med i lead-select om det saknas.
- `src/components/campaign/PreLaunchChecklist.tsx` / start-flödet: visa hur många som faktiskt kommer mejlas när inställningen är på.
- Svenska + engelska texter i `src/i18n/locales/*.json`.
