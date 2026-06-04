## Sprint 3 — Skala, polish & säkerhet inför launch

Sprint 1 fixade kritiska bugs, Sprint 2 fixade prestanda/reliability. Sprint 3 stänger UX-, säkerhets- och skalbarhetspunkter som blockerar trygg launch.

### A. Throttle redan i query (#10)
**Problem:** Throttlen 30–120 s mellan sends per inbox finns bara i minnet under en batch-körning. När cron triggar nästa körning kan flera mail från samma inbox skickas tätt inpå varandra.
**Lösning:**
- Lägg till kolumn `email_accounts.last_send_at timestamptz`.
- `process-scheduled-sends` skriver `last_send_at = now()` efter varje lyckad sändning.
- Vid plock: filtrera bort konton där `last_send_at > now() - 30s` redan i SELECT-steget.
- Inom batch: behåll cache + min-gap-logiken som finns idag.

### B. Mobillayout — sequence-editor & inbox (#11)
**Problem:** Sequence-editorns dual-pane (steg-lista + body-editor) och inbox-listan är bara byggda för desktop (1024 px+). På 375–768 px får man horisontell scroll och otillgängliga knappar.
**Lösning:**
- `SequenceEditor`: stack vertikalt under `md`, gör steplista till en kollapsbar accordion på mobile.
- `InboxThreadList` + `InboxThreadView`: master-detail-pattern. På mobile visas lista; klick öppnar full-screen view med tillbaka-knapp.
- Audit övriga sidor (`/leads`, `/sequences`, `/inbox`, `/settings`) med `preview_ui` på 375×812 + 768×1024.

### C. Rate-limit UI för account-status (#12)
**Problem:** `paused_account_error`-status visas idag bara som tyst badge. Användaren förstår inte vad som hänt eller hur de fixar det.
**Lösning:**
- Banner överst på `/sequences` och `/inbox` när minst ett konto har `status='error'` eller `paused_account_error`-sends finns: "Kontot X behöver återanslutas. Klicka för att fixa →".
- Klicket öppnar reconnect-flow direkt (samma OAuth-popup som vid första anslutning).
- Toast vid första detekterade fel (en gång per session) via realtime-sub på `email_accounts`.

### D. Auth-bytes — service-role aldrig till klient (#13)
**Problem:** Audit i koden för att säkra att inga edge functions returnerar service-role-tokens eller läcker secrets i errors.
**Lösning:**
- Sök igenom alla functions efter `SERVICE_ROLE_KEY` i response-bodies.
- Säkerställ att `error_message` som sparas i `scheduled_sends.error_message` aldrig innehåller Authorization-headers eller tokens (slica + regex-strippa "Bearer …").
- Lägg till en `redactSecrets()`-hjälpare i `_shared/`.

### E. Tomt läge för nya användare (#14)
**Problem:** Nya konton ser tomma listor utan vägledning ("0 leads", "0 sekvenser") — ingen vet vart de ska börja.
**Lösning:**
- Empty state på `/leads`: illustration + CTA "Importera CSV" + "Sök leads i Apollo".
- Empty state på `/sequences`: "Skapa din första sekvens" + länk till mall-galleri.
- Empty state på `/inbox`: "Inga mail än — anslut ett mailkonto först" + CTA.
- Onboarding-checklist på `/dashboard` (5 steg: anslut mail, importera leads, skapa sekvens, launcha, vänta på svar).

### F. Bounces DELETE-policy (#15)
**Problem:** `bounces`-tabellen har bara INSERT-policy. Användare kan inte rensa en false-positive bounce när en mailadress fixats.
**Lösning:**
- Migration: lägg till RLS-policy `bounces DELETE using (auth.uid() = user_id)`.
- Liten knapp på lead-profil-sida: "Markera som inte studsad" → tar bort raden + sätter `sequence_leads.status` tillbaka till `pending`.

### G. Kryptotokens får aldrig läsas i klient (#16)
**Problem:** Säkerställ att `email_accounts.access_token_enc`, `refresh_token_enc`, `smtp_password_enc`, `imap_password_enc` aldrig hamnar i en select från frontend.
**Lösning:**
- Audit alla `from('email_accounts').select(...)`-anrop i `src/`.
- Skapa en typad helper `selectEmailAccountSafe()` som whitelistar säkra kolumner.
- Lägg till RLS column-level grant: revoke select på `*_enc`-kolumner från `authenticated`; behåll bara för `service_role`.

### H. Timezone-validering (#17)
**Problem:** `sequences.timezone` är fri text. Felaktigt värde (t.ex. "Stockholm" istället för "Europe/Stockholm") bryter `inWindow()` tyst.
**Lösning:**
- I sequence-editorn: ersätt textinput med `<Select>` populerad från `Intl.supportedValuesOf('timeZone')`.
- Migration: CHECK-constraint som validerar via `pg_timezone_names`.
- Backfill: korrigera befintliga felaktiga rader till `'UTC'` med audit-log.

### I. Aggregerad sent-count (extra från Sprint 2-review)
**Problem:** `sentTodayRes` i scheduler hämtar rader istället för att räkna — skalar dåligt vid hög volym.
**Lösning:**
- Ny SQL-funktion `get_sent_today_by_account(account_ids uuid[])` returnerar `(email_account_id, count)`.
- Scheduler anropar RPC istället för att hämta rader.
- `SECURITY DEFINER` + `search_path=public`, GRANT EXECUTE till `service_role`.

### J. Outlook delta-sync (extra från Sprint 2-review)
**Problem:** Outlook använder fortfarande 14-dagars window och drar upp till 500 mail varje run.
**Lösning:**
- Lägg till `email_accounts.outlook_delta_link text`.
- `syncOutlook` använder `/me/mailFolders('inbox')/messages/delta?$select=...` när delta_link finns; annars första full-sync.
- Persistera `@odata.deltaLink` från sista sidan.
- Fallback till nuvarande 14d-window om delta-länken är ogiltig.

### Verifiering efter Sprint 3
- Manuell genomgång i preview på mobile (375 px) av alla huvudsidor.
- Reconnect-flow testas: koppla bort Gmail, vänta tills banner visas, klicka, OAuth, verifiera att paused sends återupptas.
- Aggregat-RPC testas med EXPLAIN ANALYZE på 10k+ rader.
- Outlook delta: koppla ett Outlook-konto, kör 2 syncar, verifiera att andra körningen är inkrementell.

### Tekniska detaljer

**Nya migrations:**
1. `email_accounts.last_send_at timestamptz`
2. `email_accounts.outlook_delta_link text`
3. `bounces` DELETE policy
4. Revoke `*_enc`-kolumner från `authenticated`
5. `sequences.timezone` CHECK constraint + backfill
6. RPC `get_sent_today_by_account`

**Nya filer:**
- `src/components/ReconnectBanner.tsx`
- `src/components/empty/*` (3 st)
- `src/components/onboarding/OnboardingChecklist.tsx`
- `supabase/functions/_shared/redactSecrets.ts`
- `src/lib/emailAccounts.ts` (typad safe-select)

**Ändrade edge functions:** `process-scheduled-sends`, `sync-inbox`, `send-email` (redact)

### Ordning
Föreslår att vi tar dem i två pass:
1. **Säkerhet & data först** (D, F, G, H, I) — RLS/migrations som ska in innan launch.
2. **UX & skala sedan** (A, B, C, E, J) — synligt arbete.

Säg till om du vill ändra ordningen eller skala bort något innan vi börjar bygga.
