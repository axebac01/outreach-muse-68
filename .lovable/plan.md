# Åtgärda Gmail OAuth callback-fel

## Problem
OAuth-flödet mot Google fungerar (token-utbyte och userinfo lyckas), men sista steget — att spara kontot i `email_accounts` — kraschar med:

```
new row for relation "email_accounts" violates check constraint "email_accounts_provider_check"
```

Frontend ser detta som "Edge function returned a non-2xx status code".

## Rotorsak
DB-constraintet på `email_accounts.provider` tillåter värdena:
- `'gmail'`, `'outlook'`, `'smtp'`

Men edge-funktionen `oauth-callback` (och `oauth-start` / `send-email`) skriver `provider = 'google'`. Mismatch → insert avvisas.

## Lösning
Standardisera på `'gmail'` (matchar befintligt constraint och är mer beskrivande för Gmail-konton specifikt; Outlook blir `'outlook'` när vi lägger till Microsoft).

### Ändringar

1. **`supabase/functions/oauth-callback/index.ts`**
   - Byt `provider: "google"` → `provider: "gmail"` i både upsert-payload och `.eq("provider", ...)`-lookup.
   - Behåll `verified.provider === "google"` som inkommande request-parameter (det är vad `oauth-start` skickar och vad state-tokenen innehåller) — men mappa till `"gmail"` när vi skriver till DB.

2. **`supabase/functions/send-email/index.ts`**
   - Byt `account.provider === "google"` → `account.provider === "gmail"` i Gmail-grenen.

3. **Robustare felhantering i `oauth-callback`**
   - Returnera 200 med `{ ok: false, error: "..." }` istället för 400 vid DB-fel, så `OAuthCallback.tsx` kan visa ett tydligt felmeddelande istället för en generisk "non-2xx"-toast. Klienten kollar redan `data?.error`.

4. **`src/pages/OAuthCallback.tsx`**
   - Efter lyckad anslutning: redirect till `/email-accounts` (nya standalone-sidan) istället för `/settings/email-accounts`.

### Inga DB-migrationer behövs
Constraintet `('gmail','outlook','smtp')` är redan rätt — vi anpassar koden till det, inte tvärtom.

## Verifiering
1. Klicka "Anslut med Google" på `/email-accounts`.
2. Slutför Google-consent.
3. Förvänta: callback-sidan visar "Account connected!" och redirectar till `/email-accounts`, där det nya kontot listas.
4. Kontrollera `email_accounts`-raden: `provider = 'gmail'`, `auth_type = 'oauth'`, `status = 'active'`.
