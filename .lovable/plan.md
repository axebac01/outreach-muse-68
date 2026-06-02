## Vad jag hittade

Jag undersökte din TEST-kampanj (`16c90403…`) och dess sekvens (`b40c2cc8…`) i databasen:

- Kampanjstatus: `draft`
- **Sekvensstatus: `active`**
- Leads: 2, Avsändare: 3, Steg: 4
- **`scheduled_sends`: 0 rader** ← inga mejl är schemalagda
- `email_messages` för sekvensen: 0

Med andra ord: sekvensen är markerad som aktiv, men `launch-sequence`-funktionen har aldrig kört igenom färdigt och skapat utskicksrader. Cron-jobbet `process-scheduled-sends` har därmed ingenting att skicka.

### Varför du sitter fast

I `SendersTab.tsx` är "Starta kampanj"-knappen `disabled` när `sequence.status === "active"` och visar "Kampanj aktiv". Eftersom sekvensen redan står som active men det inte finns några `scheduled_sends`, kan du inte trigga launch igen — knappen är låst i ett tomt aktivt läge.

Sannolik orsak till tillståndet: ett tidigare launch-försök uppdaterade sequence-statusen men insert i `scheduled_sends` misslyckades, ELLER status sattes på annat sätt och `launch-sequence` har aldrig faktiskt körts.

### Sidoanteckning (inte huvudproblemet)

En av avsändarna, `axebac01@gmail.com`, har en utgången Google refresh-token (`invalid_grant`). Den behöver återanslutas innan den kan skicka, men det är inte det som blockerar kampanjstarten — det är det tomma "active"-läget.

## Plan

1. **Återställ sekvensen så du kan starta om**
   - Skriv en migration som sätter `sequences.status = 'draft'` för sekvenser som har 0 rader i `scheduled_sends`. Det låser upp "Starta kampanj"-knappen för din TEST-kampanj (och eventuella andra i samma tillstånd).

2. **Gör `launch-sequence` idempotent och säkrare**
   - I `supabase/functions/launch-sequence/index.ts`: kör insert av `scheduled_sends` *före* `UPDATE sequences SET status='active'`. Idag sker uppdateringen efter, men om något oväntat kör mellan dem hamnar man i samma fälla. Ordningen behöver byta plats och alla fel ska abortera utan att röra status.
   - Tillåt re-launch om `status='active'` men det inte finns några `scheduled_sends` (defensivt).

3. **Förhindra "tomt aktivt" läge i UI**
   - I `SendersTab.tsx`: visa en varning + tillåt re-launch om `sequence.status === 'active'` men inga `scheduled_sends` finns för sekvensen. Lägg till en liten query (`useScheduledSendsCount`) eller utöka befintlig hook.

4. **Påminn dig att återansluta Gmail-kontot**
   - Visa en notis i listan av avsändare när `status_message` innehåller `invalid_grant` med en knapp "Återanslut" som triggar OAuth-flödet igen. (Hänger samman men separat från själva startbuggen.)

5. **Verifiering**
   - Efter migrationen: ladda om kampanjsidan, gå till "Avsändare & start", klicka **Starta kampanj**, kontrollera att `scheduled_sends` får rader och att `process-scheduled-sends`-cron plockar upp dem (kolla `email_messages` + edge function-loggar).

## Tekniska detaljer

**Migration (steg 1):**
```sql
UPDATE public.sequences s
SET status = 'draft'
WHERE s.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.scheduled_sends ss WHERE ss.sequence_id = s.id);
```

**`launch-sequence` ändringar (steg 2):**
- Kör `admin.from('scheduled_sends').insert(rows)` först, kontrollera fel.
- Endast om insert lyckas: uppdatera `sequences.status='active'` och `sequence_leads.status='active'`.
- I starten av handlern: om sekvensen är `active` men `scheduled_sends`-count = 0 → tillåt fortsättning istället för att avbryta.

**UI (steg 3):**
- Räkna `scheduled_sends` per sekvens (kan göras via en lättviktig select med `count: 'exact', head: true`).
- Om `isActive && scheduledCount === 0` → visa varningsruta "Kampanjen är märkt aktiv men inga utskick schemalagda — starta igen" och håll knappen aktiv.

Säg till om jag ska köra igång planen så fixar jag det.