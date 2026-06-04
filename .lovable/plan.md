# Verifiering av Sprint 1 — 3 brister hittade

Jag gick igenom cron, race-condition-fixen, token-felhanteringen och re-launch-guarden mot faktisk kod + databas. Tre saker behöver åtgärdas innan Sprint 2.

## 🔴 Bug 1 — Dubbla cron-jobb

Det finns nu **två** jobb för varje schemaläggare i `cron.job`:

| jobid | jobname | schedule |
|---|---|---|
| 1 | process-scheduled-sends-every-5min | `*/5 * * * *` |
| 4 | process-scheduled-sends-every-minute | `* * * * *` ← ny |
| 3 | sync-inbox-every-10-min | `*/10 * * * *` |
| 5 | sync-inbox-every-10-minutes | `*/10 * * * *` ← ny |

Konsekvens: `process-scheduled-sends` triggas både var 5:e minut OCH varje minut från två olika jobb. `sync-inbox` triggas dubbelt var 10:e minut. Förutom onödig last ökar det risken för dubbletter (se Bug 2).

**Fix:** `cron.unschedule(1)`, `cron.unschedule(3)`. Behåll jobid 4 (varje minut) och 5 (var 10:e min).

## 🔴 Bug 2 — `updated_at` uppdateras inte → "stuck"-requeue plockar levande rader

`scheduled_sends` har en `updated_at`-kolumn, **men ingen trigger** som bumpar den (verifierat i `information_schema.triggers`). Ny UPDATE som flippar `status = 'processing'` rör inte `updated_at`.

Konsekvens i `process-scheduled-sends/index.ts`:
- Recovery-steget letar `status='processing' AND updated_at < now()-10min` och sätter tillbaka till `scheduled`.
- Eftersom `updated_at` är från radens skapande blir varje rad som claimades men hör till en sekvens som lanserades >10 min sedan **omedelbart återställd** medan en parallell körning fortfarande håller på att skicka den.
- Med varje-minut-cron + 50 rader per batch ⇒ realistisk risk att samma e-post skickas två gånger.

**Fix (välj A — minimal, säker):**
1. Migration: trigger `BEFORE UPDATE ON scheduled_sends` som sätter `NEW.updated_at = now()` (samma mönster som befintlig `set_updated_at()`-funktion).
2. Lägg också explicit `updated_at: new Date().toISOString()` i claim-UPDATE i `process-scheduled-sends` som suspender + bälte.
3. Behåll requeue-logiken som den är — den blir korrekt så fort tidsstämpeln faktiskt rör sig.

## 🟡 Bug 3 — `oauth-callback` re-armar bara Google/Microsoft-rader, inte SMTP-konton

`oauth-callback/index.ts:127-134` återställer `paused_account_error` → `scheduled` när OAuth-konto återansluts. Men `process-scheduled-sends` markerar **alla** konton (även SMTP/IMAP) som `paused_account_error` vid `account.status !== 'active'` (rad 214-223). SMTP-konton går aldrig via `oauth-callback`, så när användaren fixar dem manuellt i UI blir de pausade raderna kvarliggande för alltid.

**Fix:** I `EmailAccounts.tsx`-mutationen som flippar SMTP-konto tillbaka till `active`, eller i `useUpdateEmailAccount`, kör samma re-arm-update på `scheduled_sends` (status `paused_account_error` → `scheduled`, `scheduled_for = now()`) för det aktuella `email_account_id`. Alternativt: edge-funktion `rearm-account` som båda vägarna anropar.

## ✅ Verifierat OK

- `process-scheduled-sends`: atomisk claim (SELECT ids → UPDATE … WHERE status='scheduled' RETURNING) fungerar.
- `send-email`: returnerar 401 + `reason: token_revoked` på `TokenRevokedError`. Scheduler tolkar 401 korrekt och pausar hela kontot, inte enstaka rader.
- `_shared/oauth.ts`: `isPermanentTokenError` täcker `invalid_grant` + relevanta `AADSTS`-koder. Flagar `email_accounts.status='error'` + `status_message`.
- `sync-inbox`: fångar `TokenRevokedError` och sätter `status='error'`. SMTP/IMAP-login fail flaggar också `status_message`.
- `launch-sequence`: guard byggd på `seq.status NOT IN ('draft','paused')` → returnerar 409. Status flippas till `active` först efter `scheduled_sends.insert`.
- UI (`EmailAccounts.tsx`, `SendersTab.tsx`): visar `status_message` + "Återanslut"-knapp. Översättningar finns både SV/EN.

## Frågor innan jag bygger

Inga — fixarna är entydiga. Säg "kör" så åtgärdar jag alla tre och verifierar att duplikat-jobben är borta innan Sprint 2 startar.
