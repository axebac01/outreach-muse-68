# Avregistreringar per kampanj + korrekt analysdata

## Vad jag verifierade i databasen

- Du har 5 738 leads totalt. Analyssidan hämtar bara första 1 000 raderna (API:ets standardtak), därför står det "Totalt antal leads: 1000".
- Dina 4 svarande leads ligger *bortom* de första 1 000 raderna. Därför visas "0 svar" trots att svaren finns i Unibox. Samma tak gäller utskick och avregistreringar.
- Det finns 2 avregistreringar registrerade, varav 1 är kopplad till kampanjen "TEST – leveransverifiering" och 1 saknar kampanjkoppling (avregistrering via mejlfoten utan sekvenskoppling).

## Vad som byggs

### 1. Avregistrerade syns på kampanjsidan
- Nytt nyckeltal "Avregistrerade" i kampanjens Översikt, bredvid Skickade / Schemalagda / Misslyckade / Svar.
- Siffran räknas som antal unika e-postadresser i kampanjen som avregistrerat sig (avregistreringar kopplade till kampanjen + leads med status "avregistrerad"), så samma person aldrig dubbelräknas.
- I Leads-fliken går det att filtrera på status "Avregistrerad" så man ser vilka det gäller.

### 2. Analyssidan visar riktiga siffror
- Alla underlag (leads, utskick, avregistreringar) hämtas i block om 1 000 tills allt är med — inget tak.
- "Totalt antal leads" hämtas som en ren räkning (exakt totalsumma) istället för att räkna raderna i listan.
- Svar och svarsfrekvens räknas därmed på hela datamängden, så de 3–4 svaren du ser i Unibox syns även här.
- Avregistreringar räknas på samma sätt.

## Teknisk detalj

- `src/hooks/useAnalytics.ts`: inför paginerande hämtning (`.range(from, to)` i loop, samma mönster som `fetchAllRows` i `useSequence.ts`) för `sequence_leads`, `scheduled_sends` och `unsubscribes`, plus separat `count: "exact", head: true` för totalt antal leads.
- `src/pages/Analytics.tsx`: använder totalräkningen för kortet "Totalt antal leads"; övriga beräkningar ärver de kompletta listorna utan kodändring.
- `src/hooks/useSequence.ts`: ny `useSequenceUnsubscribes(sequenceId)` som slår ihop `unsubscribes` (matchat på `sequence_id` samt på lead-mejl i kampanjen) och leads med status `unsubscribed`, deduplicerat på e-post.
- `src/components/campaign/OverviewTab.tsx`: nytt statistikkort. `src/components/campaign/LeadsTab.tsx`: statusfiltret får alternativet "Avregistrerad".
- Inga databasändringar.
