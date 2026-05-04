## OAuth 2.0 för Gmail & Outlook – anslutning, sändning & mottagning

### Mål
Användare ska kunna ansluta sin Gmail- eller Outlook-adress med ett klick (OAuth 2.0) istället för app-lösenord. Vi använder providerns API:er för att både **skicka** mejl och **läsa svar** – ingen IMAP/SMTP behövs för dessa konton.

---

### Arkitektur

```text
┌──────────────┐   1. Klick "Connect Gmail"      ┌──────────────────┐
│   Frontend   │ ──────────────────────────────▶ │ oauth-start fn   │
│ (Settings →  │                                 │  → bygger URL    │
│  Email accts)│ ◀── redirect till Google ───── │  med state       │
└──────────────┘                                 └──────────────────┘
       │
       │ 2. Användaren godkänner hos Google/Microsoft
       ▼
┌──────────────────────┐   3. ?code=...&state=  ┌──────────────────┐
│ /oauth/callback page │ ─────────────────────▶ │ oauth-callback fn│
└──────────────────────┘                        │  → byter code    │
                                                │  mot tokens      │
                                                │  → krypterar &   │
                                                │  sparar i        │
                                                │  email_accounts  │
                                                └──────────────────┘
```

### Providers vi stödjer
| Provider | Auth-endpoint | Scopes | Skicka via | Läsa via |
|---|---|---|---|---|
| **Google (Gmail)** | `accounts.google.com/o/oauth2/v2/auth` | `gmail.send`, `gmail.readonly`, `gmail.modify`, `userinfo.email`, `openid` + offline access | Gmail API `users.messages.send` | Gmail API `users.history.list` (delta-sync via `historyId`) |
| **Microsoft (Outlook)** | `login.microsoftonline.com/common/oauth2/v2.0/authorize` | `Mail.Send`, `Mail.ReadWrite`, `offline_access`, `User.Read` | Graph `/me/sendMail` | Graph `/me/mailFolders/inbox/messages` med `$filter=receivedDateTime gt …` |

> Vi använder vår **egen Google/Microsoft-app** (credentials du precis skaffat) – inte Lovables connector-gateway. Det krävs eftersom varje slutanvändare ska kunna ansluta sin egen mejladress.

---

### Secrets vi sparar (jag ber om dem efter plan-godkännande)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` (default: `common`)
- `EMAIL_TOKEN_ENCRYPTION_KEY` (om du inte redan satt den – används för pgp_sym_encrypt på tokens)

---

### Database – migration
Tabellen `email_accounts` har redan `access_token_enc`, `refresh_token_enc`, `token_expires_at`. Vi lägger till:
- `provider_account_id` (text) – Gmails/Outlooks unika user-id, för att förhindra dubbel-anslutning
- `oauth_scopes` (text) – sparar scopes vi faktiskt fick
- `provider_history_id`/`provider_delta_link` – för inkrementell inbox-sync (Gmail `historyId` finns redan som `history_id`; för Outlook använder vi `provider_delta_link`)

Ny RPC-funktion (om de inte finns):
- `encrypt_secret(plaintext text, key text) returns bytea` – wrapper kring `pgp_sym_encrypt`
- `decrypt_secret(ciphertext bytea, key text) returns text` – wrapper kring `pgp_sym_decrypt`

(Befintliga `connect-smtp-account` & `send-email` använder redan dessa namn – men de finns inte i DB ännu, så vi skapar dem nu med `pgcrypto`.)

---

### Edge functions

| Funktion | Ansvar |
|---|---|
| `oauth-start` | POST `{ provider }` → returnerar auth-URL med signed `state` (innehåller user_id + nonce). Sätter `redirect_uri` till frontendens `/oauth/callback`. |
| `oauth-callback` | POST `{ provider, code, state }` → verifierar state, byter `code` mot `access_token` + `refresh_token`, hämtar `email` från provider-userinfo, krypterar och upserts till `email_accounts`. |
| `refresh-oauth-token` (intern helper modul) | Tar `email_account_id`, kollar `token_expires_at`, refreshar via provider om <60 s kvar. Återanvänds av send/sync-funktionerna. |
| `send-email` (uppdatera) | Lägg till gren för `auth_type='oauth'`: hämta giltig token → anropa Gmail API eller Graph `/me/sendMail`. SMTP-grenen behålls. |
| `sync-inbox` (ny) | Pollar inkorgar för anslutna OAuth-konton (Gmail `history.list`, Graph `messages?$filter=…`), skapar `email_messages` med `direction='inbound'`. Matchar mot `lead.email` för att markera replies. *(Cron-aktivering görs när vi kopplar på "pause-on-reply" i sequences – stub körs manuellt först.)* |

Alla edge functions deployas med `verify_jwt = false` (default) men validerar JWT i koden för start/callback.

---

### Frontend

| Fil | Ändring |
|---|---|
| `src/components/ConnectEmailDialog.tsx` | Lägg till två stora knappar högst upp: **"Connect with Google"** och **"Connect with Microsoft"**. Klick → anropar `oauth-start` → `window.location.href = authUrl`. SMTP-formuläret blir en "Advanced / Other provider"-accordion under. |
| `src/pages/OAuthCallback.tsx` | **Ny** route `/oauth/callback`. Plockar `code` + `state` ur URL, anropar `oauth-callback`, visar spinner → toast → redirect till `/settings/email-accounts`. |
| `src/App.tsx` | Lägg till `/oauth/callback`-route (publik, ingen ProtectedRoute eftersom vi behöver fungera direkt efter redirect medan session laddas). |
| `src/pages/EmailAccounts.tsx` | Visa provider-badge med ikon (Gmail/Outlook/SMTP) + scope-warning om token-refresh misslyckats. |
| `src/i18n/locales/{en,sv}.json` | Översättningar för OAuth-knappar, callback-status, error-meddelanden. |

---

### Säkerhet
- `state`-parametern signeras med HMAC (med `EMAIL_TOKEN_ENCRYPTION_KEY` eller separat `OAUTH_STATE_SECRET`) – innehåller `user_id`, `provider`, `nonce`, `exp` (5 min).
- Tokens lagras alltid krypterade (bytea via `pgp_sym_encrypt`), aldrig i plaintext.
- Refresh-tokens byts INTE ut i frontend – allt hanteras i edge functions med service-role.
- `redirect_uri` valideras serverside mot whitelist innan utbyte.

---

### Redirect-URI:er du behöver lägga in
I **Google Cloud Console → Credentials → din OAuth client**:
```
https://id-preview--7c166a37-e2e5-4acc-84ef-dae4d2f8b6c1.lovable.app/oauth/callback
http://localhost:5173/oauth/callback   (för lokal utveckling, om du kör det)
```
+ din slutgiltiga publicerade domän när den finns.

I **Microsoft Entra → App registrations → Authentication → Web redirect URIs**: samma URL:er.

---

### Leveransordning
1. **DB-migration** – `pgcrypto` extension + `encrypt_secret`/`decrypt_secret` RPC + nya kolumner på `email_accounts`.
2. **Begär secrets** via add_secret-tool (jag stannar och väntar på att du klistrar in dem).
3. **Edge functions** – `oauth-start`, `oauth-callback`, uppdaterad `send-email` med OAuth-gren.
4. **Frontend** – `OAuthCallback`-sida, uppdaterad `ConnectEmailDialog`, route i `App.tsx`, översättningar.
5. **Test** – du klickar "Connect with Google", godkänner, hamnar tillbaka, kontot dyker upp som `oauth`-typ. Skicka test-mejl från Sequence-sidan funkar mot Gmail API.
6. **`sync-inbox`** edge function (förberedelse för pause-on-reply, cron aktiveras senare).

### Vad som händer härnäst
När du godkänner planen kör jag steg 1 direkt (DB-migration), sedan ber jag om secrets och fortsätter.