

## Anslut mejlkonton + skicka & ta emot mejl

### Mål
Användaren ska kunna ansluta en eller flera egna mejladresser till MailLead. Systemet ska sedan kunna **skicka** AI-genererade mejl från användarens egen adress och **ta emot svar** så de kan visas i appen och senare användas för sekvenslogik (paus vid svar, etc.).

### Rekommenderad lösning: OAuth 2.0 först, SMTP/IMAP som fallback

**Varför OAuth 2.0 är bättre än SMTP/IMAP för Gmail/Outlook:**
- Inget hanterande av lösenord — användaren loggar in via Google/Microsoft
- Gmail har slagit av "less secure apps" och kräver i praktiken App Passwords för SMTP, vilket är klumpigt för slutanvändaren
- Bättre deliverability (mejl skickas via Gmails egna servrar → hamnar inte i spam)
- Möjlighet att använda **Gmail Push (watch)** och **Microsoft Graph webhooks** för svar i realtid istället för att polla IMAP
- Säkrare (revokable tokens, scopes, ingen lösenordslagring)

**Strategi:**
| Provider | Skicka | Ta emot |
|---|---|---|
| Gmail / Google Workspace | Gmail API via OAuth 2.0 | Gmail API + watch-webhook (Pub/Sub) eller polling |
| Outlook / Microsoft 365 | Microsoft Graph via OAuth 2.0 | Graph subscriptions (webhook) eller polling |
| Övrigt (Zoho, Fastmail, custom) | SMTP med lösenord/app-password | IMAP IDLE / polling |

### Arkitektur

```text
┌─────────────┐    OAuth     ┌──────────────────┐
│   Frontend  │─────────────▶│ Google/MS consent│
└─────────────┘              └──────────────────┘
       │                              │
       │ code                         │
       ▼                              ▼
┌──────────────────────────────────────────┐
│  Edge Function: oauth-callback           │
│  (token exchange, kryptera, spara)       │
└──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────┐    ┌────────────────────────┐
│ email_accounts (DB) │◀──▶│ Edge: send-email       │
│ (krypterade tokens) │    │ Edge: sync-inbox       │
└─────────────────────┘    │ Edge: refresh-tokens   │
       ▲                   │ Edge: oauth-webhook    │
       │                   └────────────────────────┘
       │
┌──────────────┐
│email_messages│  ← inkommande svar + utgående mejl
└──────────────┘
```

### Steg 1 — Databas

**Ny tabell `email_accounts`** (en användare kan ha flera anslutna adresser):
- `id`, `user_id`, `email`, `provider` (`gmail`/`outlook`/`smtp`)
- `display_name`
- `auth_type` (`oauth`/`smtp`)
- `access_token`, `refresh_token`, `token_expires_at` (krypterade via pgcrypto med en server-side nyckel — aldrig exponerade till klienten)
- `smtp_host`, `smtp_port`, `imap_host`, `imap_port`, `smtp_username`, `smtp_password_enc` (endast för fallback)
- `status` (`active`/`needs_reauth`/`error`), `last_synced_at`
- `history_id` / `delta_token` (för Gmail/Graph inkrementell sync)
- RLS: användaren ser bara sina egna konton; tokens läses aldrig från klienten — endast edge functions med service role.

**Ny tabell `email_messages`**:
- `id`, `user_id`, `email_account_id`, `lead_id` (nullable — matchas på `From`-adress)
- `direction` (`outbound`/`inbound`)
- `provider_message_id`, `thread_id`, `in_reply_to`
- `from_address`, `to_address`, `subject`, `body_text`, `body_html`
- `sent_at`, `received_at`
- `status` (`queued`/`sent`/`delivered`/`bounced`/`failed`)
- RLS per `user_id`.

**Ändring i `leads`**: Index på `email` så vi snabbt kan matcha inkommande svar till rätt lead.

### Steg 2 — OAuth-flöde (Gmail + Outlook)

**Edge Function `email-oauth-start`**
- Tar emot `provider` (`gmail`/`outlook`) + `redirect_origin`
- Returnerar consent-URL med rätt scopes:
  - Gmail: `gmail.send`, `gmail.readonly`, `gmail.modify`
  - Outlook: `Mail.Send`, `Mail.Read`, `offline_access`
- Genererar `state`-token (lagras tillfälligt) för CSRF-skydd

**Edge Function `email-oauth-callback`**
- Tar emot `code` + `state`
- Byter code mot access/refresh tokens
- Hämtar användarens mejladress från provider (`/userinfo` eller `/me`)
- Krypterar tokens med `pgp_sym_encrypt` och nyckel från Supabase secrets
- Sparar i `email_accounts`
- Sätter upp watch/subscription för inkommande mejl (se Steg 4)

**Krävda secrets (be användaren lägga till efter godkännande):**
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`
- `EMAIL_TOKEN_ENCRYPTION_KEY` (32-byte slumpad nyckel)

### Steg 3 — Skicka mejl

**Edge Function `send-email`**
- Input: `email_account_id`, `to`, `subject`, `body_html`, `body_text`, `lead_id`, `in_reply_to?`
- Hämtar konto, dekrypterar token, refreshar om utgånget
- Per provider:
  - **Gmail**: `POST /gmail/v1/users/me/messages/send` med base64-encoded RFC 2822
  - **Outlook**: `POST /me/sendMail` (Graph API)
  - **SMTP**: använd `nodemailer`-kompatibel Deno-klient (t.ex. `denomailer`)
- Loggar i `email_messages` med `direction='outbound'`, `thread_id`, `provider_message_id`
- Hanterar fel: 401 → markera `needs_reauth`; 429 → returnera retry-after

### Steg 4 — Ta emot svar

**Två lägen beroende på provider:**

**A) Webhook-baserat (Gmail Pub/Sub + Graph subscriptions)** — realtid
- Vid OAuth-anslutning: registrera watch/subscription med callback-URL till `email-webhook`
- Edge Function `email-webhook` tar emot notifikation, anropar `sync-inbox` för det kontot
- Subscriptions måste förnyas (Gmail ~7 dagar, Graph ~3 dagar) → cron-jobb

**B) Polling** — enklare, fungerar för IMAP & MVP
- Cron-jobb (pg_cron) kör `sync-inbox` var 2:a minut för alla aktiva konton
- Använder `historyId` (Gmail) / `delta` (Graph) / `UIDNEXT` (IMAP) för inkrementell hämtning

**Edge Function `sync-inbox`**
- Hämtar nya mejl sedan senaste sync
- För varje mejl: matcha `from_address` → `leads.email` → koppla till `lead_id`
- Spara i `email_messages` med `direction='inbound'`
- Uppdatera `email_accounts.last_synced_at` + `history_id`
- (Senare) Trigga sekvens-paus om svar kommer in från en lead i aktiv kampanj

**MVP-rekommendation:** börja med **polling** för båda providers — enklare att felsöka, ingen Pub/Sub-setup. Lägg till webhooks i v2.

### Steg 5 — Token refresh

**Edge Function `refresh-email-tokens`** (kör via pg_cron varje 30 min)
- Hittar konton vars `token_expires_at < now() + 10 min`
- Refreshar med `refresh_token`
- Vid fel → markera `needs_reauth`, visa varning i UI

### Steg 6 — UI

**Ny sida `/settings/email-accounts`** (länk från Settings):
- Lista anslutna konton med provider-ikon, status-badge, senast synkad
- "Anslut Gmail" / "Anslut Outlook" / "Anslut via SMTP" knappar
- SMTP-formulär: host, port, användarnamn, lösenord, IMAP-host/port + "Testa anslutning"-knapp
- Per konto: "Koppla från", "Återanslut" (om `needs_reauth`)
- Översättningar (EN/SV) för alla strängar

**Uppdaterad `Outreach.tsx`**:
- Före "Approve & Send" — välj från vilket anslutet konto
- Visa skickade mejl + svar i en thread-vy under varje lead

### Steg 7 — Säkerhet

- Tokens **aldrig** skickas till klienten — endast `email`, `provider`, `status` exponeras via SELECT
- RLS-policy på `email_accounts` blockerar SELECT av token-kolumnerna (eller använd separat `email_account_secrets`-tabell utan RLS-läsning)
- Kryptering: `pgp_sym_encrypt(token, key)` där `key` finns i Vault, aldrig i kod
- OAuth `state` valideras vid callback
- Rate limiting på `send-email` (max X mejl/min/användare baserat på plan)

### Filer som skapas / ändras

| Fil | Ändring |
|---|---|
| `supabase/migrations/...` | Nya tabeller + RLS + pgcrypto + pg_cron |
| `supabase/functions/email-oauth-start/index.ts` | **Ny** |
| `supabase/functions/email-oauth-callback/index.ts` | **Ny** |
| `supabase/functions/send-email/index.ts` | **Ny** |
| `supabase/functions/sync-inbox/index.ts` | **Ny** |
| `supabase/functions/refresh-email-tokens/index.ts` | **Ny** |
| `supabase/functions/email-webhook/index.ts` | **Ny** (v2) |
| `supabase/functions/test-smtp/index.ts` | **Ny** — validera SMTP-uppgifter |
| `src/pages/EmailAccounts.tsx` | **Ny** sida |
| `src/components/ConnectEmailDialog.tsx` | **Ny** |
| `src/hooks/useEmailAccounts.ts` | **Ny** |
| `src/hooks/useEmailMessages.ts` | **Ny** |
| `src/pages/Outreach.tsx` | Lägg till kontoval + thread-vy |
| `src/pages/Settings.tsx` | Länk till email-accounts |
| `src/App.tsx` | Ny route `/settings/email-accounts` |
| `src/i18n/locales/{en,sv}.json` | Nya översättningar |

### Föreslagen leveransordning (MVP först)

1. **Fas 1 (MVP)**: DB-schema, SMTP/IMAP-fallback, UI för att ansluta konto, `send-email` via SMTP, `sync-inbox` via IMAP-polling
2. **Fas 2**: Gmail OAuth + Gmail API send/read
3. **Fas 3**: Outlook OAuth + Graph API
4. **Fas 4**: Webhooks (Pub/Sub + Graph subscriptions) för realtid
5. **Fas 5**: Sekvenser & schemaläggning (separat plan senare som du nämnde)

### Frågor innan implementation
1. Vill du att vi börjar med **Fas 1+2 (SMTP + Gmail OAuth)** i denna iteration, eller ska vi köra alla faser direkt?
2. Ska vi använda **Lovables egna mejl-infrastruktur** (Resend-baserad, kräver verifierad domän) som ett tredje alternativ för användare utan eget mejlkonto? — Inte rekommenderat för cold outreach (deliverability via egen Gmail/Outlook är mycket bättre), men kan vara bra för transaktionella notifikationer.
3. Behöver du stöd för **flera mejladresser per användare** redan i MVP, eller räcker en åt gången?

