# Deliverability-paketet (A)

Två problem upptäckta vid kodgenomgång — båda är kritiska och bör fixas i samma omgång:

1. **Reply auto-stop fungerar bara halvvägs.** `sync-inbox` sätter `sequence_leads.status = 'replied'` när någon svarar, MEN redan schemalagda rader i `scheduled_sends` annulleras inte. De skickas ändå när schemaläggaren kör. Dessutom: jag hittar **ingen cron/processor** som faktiskt plockar upp `scheduled_sends` och kallar `send-email`. Det betyder att follow-ups idag aldrig går iväg automatiskt — endast steg 1 schemaläggs av `launch-sequence`. Detta måste byggas innan resten är meningsfullt.

2. **Inga sending limits per dag/inbox utöver `daily_limit_per_account` (default 25)** — ingen warm-up ramp, ingen throttle mellan sändningar, ingen bounce-detektion.

## Vad vi bygger

### 1. Schemalagd processor (`process-scheduled-sends` edge function + cron)
- Körs var 5:e minut via `pg_cron` + `net.http_post`.
- Plockar `scheduled_sends` där `status = 'scheduled'` och `scheduled_for <= now()`.
- För varje rad:
  - Skippa om `sequence_leads.status` är `replied` / `unsubscribed` / `bounced` → markera `status = 'cancelled'`.
  - Skippa om utanför sending-window/sending-days för sequencen → flytta `scheduled_for` till nästa giltiga slot.
  - Skippa om dagens skick på inboxen ≥ daglig gräns (warm-up-justerad) → flytta till imorgon.
  - Annars: anropa `send-email`, sätt `status = 'sent'` + `sent_message_id`. Vid fel: `status = 'failed'` + retry max 3.
- Efter lyckad send: schemalägg nästa steg för leaden (`current_step + 1`) baserat på `wait_days`.

### 2. Auto-cancel vid reply
I `sync-inbox` direkt efter att `sequence_leads.status = 'replied'` sätts:
```ts
await admin.from("scheduled_sends")
  .update({ status: "cancelled" })
  .eq("sequence_id", sequenceId)
  .eq("lead_id", leadId)
  .eq("status", "scheduled");
```
Samma sak vid unsubscribe (i `unsubscribe`-funktionen) och vid hård bounce (se #4).

### 3. Warm-up ramp + sending limits per inbox
Ny tabell `email_account_sending_limits`:
- `email_account_id`, `warmup_enabled` (bool, default true), `warmup_started_at`, `daily_cap_override` (nullable int).
- Effektiv daglig gräns:
  - Om `warmup_enabled` och konto är < 14 dagar gammalt: `min(20 + dag*5, 50)`.
  - Annars: `daily_cap_override ?? sequence.daily_limit_per_account`.
- Räknas mot dagens redan skickade i `email_messages` där `direction='outbound'` och `sent_at` idag.
- Throttling: efter varje send i processorn — slumpmässig fördröjning 30–120s mellan sändningar från samma inbox (implementeras genom att nästa rad får `scheduled_for = max(now, lastSendForInbox + jitter)`).

UI: I **Email Accounts** — visa "Dagens skick: 12/30 (warm-up dag 4)" + toggle för warm-up + override-fält.

### 4. Bounce-hantering
- I `sync-inbox` när vi parsar inkommande: detektera DSN/bounce (from `mailer-daemon@`, eller `Content-Type: multipart/report`, eller subject matchar `/^(undeliverable|delivery (status notification|failure)|mail delivery failed)/i`).
- Extrahera den bouncade adressen från body (regex `/<([^>]+@[^>]+)>/` i diagnostic part).
- Hård bounce → ny tabell `bounces (user_id, email, reason, bounced_at, hard)`. Sätt `sequence_leads.status = 'bounced'` för matchande leads. Annullera deras `scheduled_sends` (samma logik som reply).
- Soft bounce → loggas men inga åtgärder.

### 5. UI-feedback
- **Inbox**: badge "Svarat — sekvens pausad" på trådar där leaden är `replied`.
- **Sequence detail**: stats-rad "X scheduled • Y sent • Z replied • W bounced • V cancelled".
- **Email Accounts**: status-pill "Warm-up dag 4 (cap 40/dag)".

## Tekniska detaljer

**Filer:**
- `supabase/functions/process-scheduled-sends/index.ts` (ny)
- `supabase/functions/sync-inbox/index.ts` (cancel scheduled, bounce-detect)
- `supabase/functions/unsubscribe/index.ts` (cancel scheduled)
- `supabase/migrations/<ts>_deliverability.sql`:
  - `email_account_sending_limits`
  - `bounces`
  - utöka `scheduled_sends.status` med `'cancelled'`
  - lägg till `sequence_leads.status` värde `'bounced'`
  - pg_cron job som kallar processorn var 5:e min via service role
- `src/pages/EmailAccounts.tsx` (warm-up UI)
- `src/pages/SequenceBuilder.tsx` / detalj (statsrad)

**Frågor innan jag börjar bygga:**
1. Warm-up-default — ska den vara **på automatiskt** för alla nya inboxes (rekommenderas) eller opt-in?
2. Cron-intervall: **5 min** ok, eller vill du ha snabbare (1 min) trots högre last?

Säg "kör" så bygger jag direkt med default = warm-up på + 5 min cron, om du inte säger annat.