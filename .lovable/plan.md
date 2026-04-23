

## Sequence Builder – multi-step kampanjer med leads, sekvenser, schema och avsändare

### Mål
En ny kampanjtyp ("Sequence") där du i fyra steg bygger ett komplett utskick: **Leads → Sequence → Schedule → Sending**. Mejlen skickas automatiskt enligt schemat från dina anslutna mejladresser, med personliga variabler per lead.

### Wizard-flöde (`/sequence/:id`)

```text
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐
│  Leads  │ → │ Sequence │ → │ Schedule │ → │ Sending │ → Launch
└─────────┘   └──────────┘   └──────────┘   └─────────┘
```

Sticky stepper i toppen, "Save & continue" / "Back" längst ner. Allt sparas löpande som draft – inget går iväg förrän användaren klickar **Launch** på sista steget.

---

### Steg 1 — Leads
- **Manuellt**: rad-för-rad-tabell med fälten `email`, `full_name`, `first_name`, `last_name`, `role`, `phone`, `company`.
- **CSV-uppladdning**: drag-and-drop → preview av första 5 raderna → **column mapping UI** (dropdown per kolumn → våra fält). Auto-detektering via header-namn där det går.
- Visa antal giltiga / ogiltiga / dubletter. Skip rader utan `email`.
- Bulk-insert i `sequence_leads` när användaren bekräftar.

### Steg 2 — Sequence Builder
- Vertikal lista med "steps". Första steget = Email 1.
- Per steg:
  - **Subject** (om tom på steg 2+ → ärver från föregående och skickar som reply i samma tråd)
  - **Body** (rich textarea med variabel-chip-picker: `{{first_name}}`, `{{last_name}}`, `{{full_name}}`, `{{company}}`, `{{role}}`, `{{email}}`, `{{phone}}`)
  - **Wait X days after previous** (number input, döljs på steg 1)
- Knapp **+ Add follow-up** längst ner.
- Live preview-panel till höger som renderar mejlet med en vald lead's data.
- Validering: minst 1 steg, body får inte vara tom, variabler matchas mot tillgängliga fält.

### Steg 3 — Schedule
- **Timezone** (Select med alla IANA-zoner, default = browserns)
- **Start date + time** (Shadcn Calendar + time picker)
- **Sending window** (mån–fre, 09:00–17:00 default, togglas per veckodag)
- Pausa vid svar: toggle (default på) – om en lead svarar pausas hens sekvens.

### Steg 4 — Sending
- **Avsändar-konton**: lista alla anslutna `email_accounts` med checkboxar. Minst 1 måste väljas.
- Vid flera valda: roteras round-robin per lead.
- **Daily send limit per account** (number input, default **25**, varning vid >50 med tooltip om deliverability).
- Räknar ut och visar: *"Med X leads och Y konton à 25/dag tar utskicket ~Z dagar."*
- **Launch-knapp** (primary, hero-style) → sätter status `active` och första `scheduled_sends`-rad per lead.

---

### Database (ny migration)

| Tabell | Syfte |
|---|---|
| `sequences` | Kampanjmetadata: `id`, `user_id`, `name`, `status` (`draft`/`active`/`paused`/`completed`), `timezone`, `start_at`, `sending_days` (jsonb), `sending_window_start`, `sending_window_end`, `pause_on_reply` (bool), `daily_limit_per_account` (int), `created_at` |
| `sequence_leads` | Leads-listan: `id`, `sequence_id`, `user_id`, `email`, `full_name`, `first_name`, `last_name`, `role`, `phone`, `company`, `status` (`pending`/`active`/`replied`/`completed`/`bounced`), `current_step` |
| `sequence_steps` | Mejlmallar: `id`, `sequence_id`, `step_order`, `subject` (nullable), `body`, `wait_days` |
| `sequence_senders` | Vilka konton som används: `id`, `sequence_id`, `email_account_id` |
| `scheduled_sends` | Kö för utskick: `id`, `sequence_id`, `lead_id`, `step_id`, `email_account_id`, `scheduled_for`, `status` (`scheduled`/`sent`/`failed`/`skipped`), `sent_message_id` |

Alla får RLS `auth.uid() = user_id` (eller via `sequence_id` join för barntabeller).

### Edge functions (delvis senare)

| Funktion | Ansvar |
|---|---|
| `launch-sequence` | Anropas vid Launch. Skapar första `scheduled_sends`-rad per lead enligt schema + roterar avsändare. |
| `process-scheduled-sends` (cron, 1 min) | Hämtar `scheduled_sends` där `scheduled_for <= now()` & inom sending window. Anropar befintliga `send-email`. Skapar nästa steg-rad om sekvensen har fler steg. |
| `pause-on-reply` (kallas av `sync-inbox` senare) | Markerar lead `replied` och tar bort kommande `scheduled_sends`. |

> Cron + `process-scheduled-sends` byggs i denna iteration som stub som triggas manuellt; full pg_cron-aktivering kan ske när IMAP-sync också är på plats.

### Frontend-struktur

| Fil | Ändring |
|---|---|
| `src/pages/SequenceBuilder.tsx` | **Ny** – wizard-shell med stepper, route-state per steg |
| `src/pages/sequence/StepLeads.tsx` | **Ny** |
| `src/pages/sequence/StepSequence.tsx` | **Ny** – inkl. `VariablePicker` och preview |
| `src/pages/sequence/StepSchedule.tsx` | **Ny** |
| `src/pages/sequence/StepSending.tsx` | **Ny** |
| `src/components/CsvColumnMapper.tsx` | **Ny** – återanvändbar för CSV-mapping |
| `src/components/sequence/SequenceStepCard.tsx` | **Ny** |
| `src/components/sequence/EmailPreview.tsx` | **Ny** – renderar `{{var}}` med lead-data |
| `src/lib/renderTemplate.ts` | **Ny** – ersätter `{{variable}}` mot lead-fält |
| `src/hooks/useSequence.ts` | **Ny** – CRUD för sequence + steps + leads + senders |
| `src/pages/Dashboard.tsx` | Lägg till "Sequence campaigns"-sektion + "New sequence"-knapp |
| `src/App.tsx` | Routes: `/sequence/new`, `/sequence/:id/leads`, `/sequence/:id/sequence`, `/sequence/:id/schedule`, `/sequence/:id/sending` |
| `src/i18n/locales/{en,sv}.json` | Översättningar för hela wizarden |

### UX-detaljer
- Stepper visar checkmark på färdiga steg, lås framåt-navigering tills steget är giltigt.
- Auto-save (debounce 1 s) på alla fält → "Saved ✓" indikator.
- Variabel-chip-picker över body-textarea: klick infogar `{{first_name}}` på cursor-position.
- Tomma `first_name` faller automatiskt tillbaka på `full_name.split(' ')[0]` vid render.
- "Send test email"-knapp på steg 2 → skickar ett enskilt mejl till användarens egen adress.

### Översättningar (exempel)
- "Sequence builder" / "Sekvensbyggare"
- "Add follow-up" / "Lägg till uppföljning"
- "Wait X days after previous" / "Vänta X dagar efter föregående"
- "Daily limit per account" / "Dagligt tak per konto"
- "Pause when lead replies" / "Pausa när lead svarar"

### Gammal vs ny "campaign"
Den befintliga `campaigns`-tabellen (AI-genererade engångsmejl) lämnas orörd. Den nya sequence-funktionen är en parallell entitet under `/sequence/...`. Dashboard får två tabbar: **AI Drafts** (befintligt) och **Sequences** (nytt).

### Leveransordning
1. DB-migration + hooks
2. Wizard-shell + Steg 1 (Leads + CSV-mapping)
3. Steg 2 (Sequence builder + variabler + preview)
4. Steg 3 (Schedule)
5. Steg 4 (Sending) + Launch
6. `launch-sequence` + `process-scheduled-sends` edge functions
7. Dashboard-integration + översättningar

