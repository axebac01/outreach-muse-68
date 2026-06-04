# Implementationsplan — launch-blockerare

Vi hoppar över #4 (Google OAuth) och #5 (Analytics demodata) enligt din instruktion. Plan i tre sprintar — vi tar Sprint 1 först och stämmer av innan vi går vidare.

## Sprint 1 — kritiska blockerare (gör nu)

### A. Cron-jobb för utskick och inbox-sync (#1)
Schemalägger två återkommande jobb mot edge functions:

- `process-scheduled-sends` — varje minut
- `sync-inbox-cron` — var 10:e minut

Läggs in via `supabase--insert` (inte migration — innehåller projekt-URL och service-key och får inte köras vid remix). Använder `pg_cron` + `pg_net` (redan installerade). Auth via service-role key i header.

Verifiering efteråt: kontrollera att jobben dyker upp och att första körningen producerar loggar i båda funktionerna.

### B. Race condition i scheduler (#2)
I `process-scheduled-sends/index.ts`:

- Innan loopen — kör en `UPDATE scheduled_sends SET status='processing', updated_at=now() WHERE id IN (...) AND status='scheduled' RETURNING *`. Endast rader som faktiskt flippades behandlas.
- Om en cron-körning överlappar nästa fångar `WHERE status='scheduled'`-villkoret inget dubbelt.
- Vid lyckat utskick: `status='sent'`. Vid fel: `status='failed'` (som idag). Vid oväntat crash mellan processing och sent → läggs till en `requeue_stuck_processing` regel: rader som varit `processing` i >10 min flippas tillbaka till `scheduled` i början av varje körning.

### C. Token-fel märks i UI:t (#3)
Två delar:

1. I `_shared/oauth.ts` — när `getValidGoogleAccessToken` / `getValidMicrosoftAccessToken` får `invalid_grant` eller motsvarande permanent fel, kasta ett typat fel (`TokenRevokedError`).
2. I `send-email` och `sync-inbox` — fånga `TokenRevokedError`, sätt `email_accounts.status='error'` och `status_message='Anslutningen har gått ut — återanslut kontot'`. Returnera 401 (inte 500) så schedulern kan särskilja.
3. I `process-scheduled-sends` — vid 401 från send-email: pausa alla `scheduled` rader för det kontot (sätt `status='paused_account_error'`) i stället för att markera dem `failed`. När kontot återansluts → flippas de tillbaka till `scheduled`.
4. I UI:t (`EmailAccounts.tsx`) — visa redan idag `status_message` om vi har det. Verifiera att banner syns när status='error'. Lägg till diskret "Återanslut"-knapp som triggar oauth-start på nytt.

### D. Re-launch duplicering (#6)
I `launch-sequence/index.ts:44` — byt guarden från "finns scheduled_sends?" till `sequences.status NOT IN ('draft','paused')`. Returnera 409 med meddelande "Sekvensen är redan startad" om den är aktiv/klar.

## Sprint 2 — efter avstämning

- **#7 N+1 i schedulern** — batchhämta sequence/account/limits/sent-counts per körning istället för per rad.
- **#8 Inbox-sync fönster** — höj från 14d/50 till 30d/200, paginera om fler finns.
- **#9 Retry på transienta fel** — lägg till `attempt_count` + `next_attempt_at` på `scheduled_sends`. 429/503/network → exponential backoff (1m, 5m, 30m, 2h), max 4 försök, sedan `failed`.

## Sprint 3 — löpande

- #10 Persistera throttle-state i DB istället för per-invocation cache
- #11 Mobil layout för Leads + Inbox
- #12 Rate-limit på `track-visit` per site_key
- #13 Byt `auth.getClaims()` mot `auth.getUser()` i `leads-search`
- #14 Empty state i Inbox när inga konton anslutna
- #15 DELETE-policy på `bounces`
- #16 Dölj `access_token_enc`/`refresh_token_enc` via view (security_invoker) + neka direktläsning på basetabellen
- #17 Robust timezone-validering i sändningsfönstret

## Tekniska detaljer (Sprint 1)

**Migrationer:** ingen ny SQL-migration behövs för cron — `pg_cron`/`pg_net` finns redan. Cron-jobben läggs in via `supabase--insert` (projekt-specifik data).

**Schema-ändringar:** ny status-värden på `scheduled_sends`: `'processing'`, `'paused_account_error'`. Görs via migration (CHECK constraint om sådan finns).

**Nya kolumner:** inga i Sprint 1.

**Edge functions att redeploya efter ändringar:** `process-scheduled-sends`, `send-email`, `sync-inbox`, `launch-sequence`.

## Vad jag INTE rör i denna plan
- #4 Google OAuth — separat scope-beslut senare
- #5 Analytics mockdata — du tar det själv
- Innehåll/copy på landningssidan
- Stripe/credits-flöden

Godkänn så börjar jag med Sprint 1 (A→B→C→D i den ordningen, så att cron är på plats innan vi ändrar scheduler-logiken).