# Visa mejlstatus inne i kampanjer

Idag finns ingen synlighet i kampanjvyn över hur många mejl som faktiskt har skickats eller vad status är per lead. All sändningsdata finns redan i `scheduled_sends` (status: `scheduled`, `sent`, `failed`, etc.) — vi behöver bara exponera den.

## Vad som byggs

### 1. Översikt-fliken — sammanfattning
Lägg till statistikkort ovanpå befintliga kort:
- **Skickade mejl** (status = `sent`)
- **Schemalagda** (status = `scheduled`, framtida `scheduled_for`)
- **Misslyckade** (status = `failed`)
- **Svar** (leads med `status = 'replied'`)

### 2. Leads-fliken — per-lead status
Utöka leads-tabellen med två nya kolumner:
- **Status** — färgkodad badge baserad på senaste sändning för leaden:
  - "Inte skickat" (grå) — ingen `scheduled_sends`-rad
  - "Schemalagt" (blå) — har `scheduled` rader
  - "Skickat" (grön) — minst ett `sent`
  - "Misslyckades" (röd) — senaste är `failed`
  - "Svarat" (lila) — `sequence_leads.status = 'replied'`
- **Skickade / Totalt steg** — t.ex. "2 / 5" (antal `sent` / antal `sequence_steps`)
- **Senaste aktivitet** — tidsstämpel (`sent_at` eller `scheduled_for`)

Tabellen får också ett enkelt status-filter ovanför (Alla / Skickat / Schemalagt / Misslyckades / Inte skickat).

## Tekniska detaljer

**Ny hook** `useSequenceSendStats(sequenceId)` i `src/hooks/useSequence.ts`:
- Hämtar alla `scheduled_sends` för sekvensen i en query
- Hämtar antal `sequence_steps` för "X / Y"-räknaren
- Returnerar:
  - `summary`: `{ sent, scheduled, failed, replied }` (för Översikt)
  - `byLeadId`: `Map<leadId, { sent, total, lastStatus, lastAt }>` (för Leads-tabellen)

Genom att aggregera klientsidan slipper vi nya RPC:er. `scheduled_sends` har redan rätt RLS (user_id = auth.uid).

**Filer som ändras:**
- `src/hooks/useSequence.ts` — ny hook
- `src/components/campaign/OverviewTab.tsx` — fyra nya stat-kort
- `src/components/campaign/LeadsTab.tsx` — nya kolumner + filter

Inga DB-ändringar behövs.

## Utanför scope
- Klick/öppning-tracking per mejl (kräver ny pixel-data)
- Detaljerad timeline per lead (kan läggas till senare som expanderbar rad)
- Export
