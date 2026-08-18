# Ta bort leads i bulk i en kampanj

Lägg till möjligheten att markera flera leads och radera dem — eller radera alla som matchar nuvarande filter/sökning.

## Så fungerar det

- Ny kryssruta först i varje rad i lead-tabellen, plus en "markera alla"-kryssruta i tabellhuvudet (markerar de leads som visas på aktuell sida).
- När minst ett lead är markerat visas en rad ovanför tabellen: "X markerade" med knapparna "Ta bort markerade" och "Avmarkera".
- Bredvid sök/filter läggs en knapp "Ta bort alla (N)" som tar bort alla leads som matchar aktuell sökning och statusfilter (utan filter = hela listan).
- Båda raderingarna kräver bekräftelse i en dialog som visar exakt antal och varnar att schemalagda utskick till dessa leads också försvinner. Ingen ångra-funktion.
- Efter radering: toast med antal borttagna, markeringen nollställs, listan och antalet uppdateras.

## Teknisk detalj

- Ny hook `useDeleteSequenceLeads` i `src/hooks/useSequence.ts`: raderar i `sequence_leads` med `.in("id", ids)` i satser om 500 id:n för att undvika för långa förfrågningar. Invaliderar `sequence_leads`, lead-count, send-stats och kampanjlistan.
- Radering av ett lead tar automatiskt bort dess schemalagda utskick (databasen kaskaderar `scheduled_sends`). Redan skickad e-posthistorik påverkas inte.
- `src/components/campaign/LeadsTab.tsx`: `selectedIds`-state (Set), nollställs vid byte av filter/sökning/sida; bekräftelse via befintlig `AlertDialog`-komponent; knappar inaktiverade under pågående radering.
