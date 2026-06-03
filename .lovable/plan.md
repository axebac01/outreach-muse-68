## Svar på frågan
Det finns ingen knapp idag — statusen `paused`/`completed` finns i databasen men kan inte ändras från gränssnittet. Bakgrundsjobbet `process-scheduled-sends` respekterar redan `paused` (hoppar över schemalagda mejl), så själva mekaniken finns — bara UI saknas.

## Vad jag föreslår att vi lägger till

**Plats:** Headern på kampanjsidan (`src/pages/CampaignDetails.tsx`), till höger om namn-fältet. Synlig på alla flikar.

**Knappar beroende på status:**
- `draft` → ingen extra knapp (start sker fortfarande via "Avsändare & start"-fliken).
- `active` → **Pausa** (sekundär knapp, ikon `Pause`) + overflow-meny med **Avsluta kampanj**.
- `paused` → **Återuppta** (primär knapp, ikon `Play`) + overflow med **Avsluta kampanj**.
- `completed` → låst badge "Slutförd", ingen knapp.

**Beteende:**
- **Pausa:** Sätter `sequences.status = 'paused'`. Redan schemalagda mejl ligger kvar men skickas inte (jobbet hoppar dem). Toast: "Kampanj pausad — inga nya mejl skickas".
- **Återuppta:** Sätter `status = 'active'`. Toast: "Kampanj aktiv igen".
- **Avsluta:** Bekräftelsedialog (`AlertDialog`) → sätter `status = 'completed'` OCH avbokar alla framtida `scheduled_sends` för sekvensen (`update scheduled_sends set status='cancelled' where sequence_id=? and status='scheduled'`). Irreversibelt i UI:t. Toast: "Kampanj avslutad".

## Teknisk implementation

**Ny hook** `useSequenceStatus(sequenceId)` i `src/hooks/useSequence.ts` med tre mutationer: `pause()`, `resume()`, `complete()`. `complete()` kör båda updates (sequence-status + cancel scheduled). Invaliderar `["campaign_sequence", campaignId]` + `["sequence-leads"]` + `["sequence-send-stats"]`.

**Ny komponent** `src/components/campaign/CampaignStatusActions.tsx` som renderar rätt knappar utifrån status, inkl. AlertDialog för "Avsluta".

**Integration** i `CampaignDetails.tsx`: rendera `<CampaignStatusActions sequence={sequence} campaignId={id} />` i headern bredvid namnet.

**Status-badge** på `OverviewTab` uppdateras automatiskt via query-invalidering (ingen kodändring där).

**RLS:** Inga ändringar — användare kan redan uppdatera sina egna `sequences` och `scheduled_sends` via befintliga policies.

## Filer som ändras
- `src/hooks/useSequence.ts` (ny hook)
- `src/components/campaign/CampaignStatusActions.tsx` (ny)
- `src/pages/CampaignDetails.tsx` (rendera knapparna i header)

## Out of scope
- Pausa per lead eller per step.
- Schemaläggning av automatisk paus (t.ex. "pausa till nästa måndag").
- Återstart av en `completed` kampanj.