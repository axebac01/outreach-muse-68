# Slå ihop kampanjer och sekvenser

## Målbild
En **kampanj** är allt: kontext (målgrupp, produkt, erbjudande, ton), leads, mejl-steg, schema och avsändare. Sekvensen finns inte längre som ett separat koncept i UI:t — den är en flik **inne i** kampanjen. AI används som hjälpknapp när man skriver mejl-stegen, baserat på kampanjens kontext + företagsinfo.

Unibox AI (klassning av inkommande svar + föreslagna svar) påverkas inte — den ligger kvar oförändrad.

## Ny kampanj-vy (`/campaign/:id`)

Tabbar i ordning:

1. **Översikt** — namn, kontext (målgrupp, produkt, erbjudande, ton), status (utkast/aktiv/pausad), enkel statistik (skickat, svar, bounces).
2. **Leads** — lista, lägg till manuellt, importera CSV, ta emot från Mailhunter.
3. **Sekvens** — bygg mejl-stegen (steg 0 = första mejlet, steg 1 = uppföljning efter X dagar, osv). På varje steg finns en **"Skriv med AI"**-knapp som genererar ämne + brödtext utifrån kampanjkontexten + företagets info. Variabler som `{{first_name}}` stöds.
4. **Schema** — sändningsdagar, tidsfönster, tidszon, dagligt tak per konto, paus-på-svar, startdatum.
5. **Avsändare** — välj vilka kopplade mejlkonton som ska skicka.
6. **Launch / Status** — knapp "Starta kampanj" som schemalägger utskick. När aktiv visas progress.

## Vad som tas bort från UI

- Egen sida för att skapa fristående sekvens (`/sequence/:id` + dess flow).
- Outreach-vyn (`/outreach/:id`) där man godkänner AI-mejl per lead — ersätts av AI-knappen i sekvens-fliken.
- "Sekvenser"-länk i sidomenyn (om den finns).
- Dashboard visar bara kampanjer, inte separata sekvenser.

## Datamodell

Vi behåller båda tabellerna i databasen för att hålla edge-funktionerna (`launch-sequence`, `process-scheduled-sends`, `import-leads`, schemalagda jobb) intakta — men kopplar dem 1-till-1:

- Lägg till `sequences.campaign_id` (uuid, unique). När en kampanj skapas skapas automatiskt en tillhörande sequence-rad.
- Allt UI läser/skriver via kampanjen och slår upp den länkade sekvensen i bakgrunden.
- `sequence_steps`, `sequence_leads`, `sequence_senders`, `scheduled_sends` är oförändrade.
- `generated_outreach`-tabellen och `generate-outreach`-edge-funktionen tas bort (ersätts av en enklare AI-funktion som returnerar ämne+body till sekvens-stegs-editorn).
- `leads.campaign_id` används fortfarande som "lead i kampanj"; vid launch synkas dessa till `sequence_leads` på den länkade sekvensen.

## Rensning av befintlig data

Innan migreringen körs: töm `campaigns`, `sequences`, `sequence_steps`, `sequence_leads`, `sequence_senders`, `scheduled_sends`, `generated_outreach`, `leads`. Ingen produktionsdata att rädda enligt ditt besked.

## AI-hjälp i sekvens-editorn

Ny edge-funktion `ai-write-step`:
- Input: `campaign_id`, `step_index`, valfri "instruktion" (t.ex. "kortare", "mer formell"), tidigare stegs text för kontext.
- Slår upp kampanjkontext + företagsprofil (`profiles.company_*`).
- Anropar Lovable AI Gateway (`google/gemini-2.5-flash`) och returnerar `{ subject, body }`.
- Skriver inte direkt till databasen — användaren får förhandsgranska och spara.

## Mailhunter-import

Endpoint `import-leads` ändras minimalt: tar emot `campaign_id` istället för `sequence_id`/`campaign_id`-val. Leads landar i kampanjen och syns i Leads-fliken. När kampanjen startas följer de med till sekvensen.

## Översättningar

Sv/en strängar för: tabb-namn, AI-knapp, tomma-tillstånd, "Starta kampanj", borttagna sekvens-strängar.

---

## Tekniska detaljer

**Filer att skapa:**
- `src/pages/CampaignDetails.tsx` — skrivs om till tabbad layout
- `src/components/campaign/OverviewTab.tsx`
- `src/components/campaign/LeadsTab.tsx` (återanvänd nuvarande `StepLeads`-logik)
- `src/components/campaign/SequenceTab.tsx` (återanvänd `StepSequence` + AI-knapp)
- `src/components/campaign/ScheduleTab.tsx` (återanvänd `StepSchedule`)
- `src/components/campaign/SendersTab.tsx` (återanvänd `StepSending`)
- `src/components/campaign/AiWriteStepDialog.tsx`
- `supabase/functions/ai-write-step/index.ts`

**Filer att ta bort:**
- `src/pages/SequenceBuilder.tsx` + `src/pages/sequence/*`
- `src/pages/Outreach.tsx`
- `supabase/functions/generate-outreach/`

**Routes:**
- Behåll `/campaign/new` och `/campaign/:id` (med valfri `?tab=`).
- Ta bort `/sequence/:id/*` och `/outreach/:id`.

**Migrationer (i ordning, efter godkännande):**
1. `ALTER TABLE sequences ADD COLUMN campaign_id uuid UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE;`
2. Trigger `after insert on campaigns` som skapar en tom `sequences`-rad länkad till kampanjen.
3. `DROP TABLE generated_outreach;`
4. Data-rensning (TRUNCATE) körs som separat insert-call.

**Launch-flöde:** "Starta kampanj"-knappen kallar befintlig `launch-sequence` med den länkade `sequence_id`. Ingen ny edge-funktion behövs där.
