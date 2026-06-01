
## Kartläggning

### Nuläge
- **53 `toast.error`-anrop** i frontend, blandning av:
  - Hårdkodad svenska: `"Kunde inte spara"`, `"Slut på AI-credits"`, `"Något gick fel"` (de flesta)
  - Hårdkodad engelska: `"File too large (max 5MB)"`, `"Unsupported file"`, `"Failed to save"` (LeadsTab, EditSignatureDialog)
  - i18n via `t()`: bara ett fåtal ställen (EmailAccounts, Settings, CreateCampaign, AppPasswordGuide)
  - Råa server-meddelanden via `e?.message`: ofta engelska, kryptiska (t.ex. `"535 5.7.139 Authentication unsuccessful"`, `"Missing SMTP credentials"`, `"FIRECRAWL_API_KEY missing"`)
- **Edge functions** returnerar engelska tekniska strängar: `"Unauthorized"`, `"Missing fields"`, `"Account not found"`, `"Gmail send failed: 401 ..."` — dessa visas direkt för användaren.
- **i18n-namespace `errors`** finns inte i `sv.json`/`en.json` idag. Inget centralt sätt att översätta error-koder.
- Inga felkoder från servern — frontend kan inte mappa till lokaliserad text utan att parsa fritext.

### Problemområden (prioriterat)
1. **SMTP/anslutning** (`test-smtp`, `connect-smtp-account`, `AppPasswordGuide`, `ConnectEmailDialog`) — vanligaste stället där användaren ser fel. Idag: råa SMTP-koder på engelska.
2. **AI-flöden** (`generate-sequence`, `improve-step`, `AiWriteSequenceDialog`, `SequenceStepCard`) — har redan vissa kodade fel (`rate_limited`, `no_credits`) men inkonsekvent översättning.
3. **Lead-import** (`LeadsTab`, `import-leads`) — engelska meddelanden mitt i svenskt flöde.
4. **Skicka mejl** (`send-email`) — visar `Gmail send failed: 401 <stora JSON-blobbar>` rått.
5. **Auth/OAuth** (`Login`, `Signup`, `ConnectEmailDialog`) — visar `error.message` från Supabase rått (engelska).
6. **Generiska "Något gick fel"** — saknar kontext, gör support svårt.

---

## Plan

### 1. Inför ett `errors`-namespace i i18n
Lägg till `errors.*` i `sv.json` och `en.json` med:
- Kategorier: `auth`, `smtp`, `oauth`, `ai`, `upload`, `import`, `send`, `network`, `validation`, `generic`
- Specifika nycklar för varje kända felkod, t.ex.:
  - `errors.smtp.authFailed` – "Fel användarnamn eller app-lösenord. Kontrollera att 2FA är på och att du klistrade in app-lösenordet utan mellanslag."
  - `errors.smtp.connectionRefused` – "Kunde inte nå mejlservern (host/port stämmer inte, eller brandvägg blockerar)."
  - `errors.smtp.tlsFailed` – "TLS-handskakning misslyckades. Prova port 465 (SSL) eller 587 (STARTTLS)."
  - `errors.ai.noCredits` – "Slut på AI-credits. Fyll på i Inställningar → Användning."
  - `errors.ai.rateLimited` – "AI är upptagen, försök igen om en stund."
  - `errors.upload.tooLarge` – "Filen är för stor (max {{max}})."
  - `errors.send.gmailAuth` – "Gmail-token har gått ut. Återanslut kontot under E-postkonton."
  - `errors.generic.withDetail` – "Något gick fel: {{detail}}"
  - `errors.generic.unknown` – "Något oväntat hände. Försök igen, eller kontakta support om problemet kvarstår."

### 2. Centralt felmappnings-hjälpverktyg
Skapa `src/lib/errorMessages.ts`:
```ts
export function toUserMessage(err: unknown, t: TFunction, fallbackKey?: string): string
```
- Tar in error-objekt (från `supabase.functions.invoke`, fetch, etc.)
- Plockar ut `error.code`, `error.message`, HTTP-status
- Matchar mot kända mönster (regex på SMTP-koder `535`, `421`, `connection refused`, Gmail JSON-felkoder, Supabase auth-felkoder)
- Returnerar lokaliserad sträng från `errors`-namespace
- Faller tillbaka på `errors.generic.withDetail` med rå message, annars `errors.generic.unknown`

### 3. Edge functions: returnera strukturerade fel
Uppdatera de viktigaste functions (`test-smtp`, `connect-smtp-account`, `send-email`, `generate-sequence`, `improve-step`, `analyze-company`, `sync-inbox`, `launch-sequence`) att returnera:
```json
{ "error": { "code": "smtp_auth_failed", "message": "...", "detail": "535 5.7.139..." } }
```
Frontend mappar `code` till i18n-nyckel; `detail` visas bara i dev/expanderbar accordion.

### 4. Migrera frontend-anropare
Ersätt alla `toast.error("hårdkodad text")` och `toast.error(e?.message)` med:
```ts
toast.error(toUserMessage(e, t, "errors.smtp.connectFailed"));
```
- Prioritetsordning: filer från Problemområden 1–5 ovan först.
- Behåll redan i18n-aware ställen (EmailAccounts, Settings, CreateCampaign) men låt dem använda nya `errors.*`-nycklar där relevant.

### 5. Auth-fel (Supabase)
I `Login`/`Signup`: mappa Supabase auth-felkoder (`invalid_credentials`, `email_not_confirmed`, `over_email_send_rate_limit`, `user_already_exists`) till `errors.auth.*` istället för att visa rå `error.message`.

### 6. Verifiering
- Manuell rök-test i preview med `lng=sv` och `lng=en`: trigga några välkända fel (fel app-lösenord, för stor fil, fel inloggning) och bekräfta svensk text.
- Build körs automatiskt (fångar typfel).

---

## Tekniska detaljer

**Filer som skapas:**
- `src/lib/errorMessages.ts` — central mapping
- (ev.) `src/lib/errorCodes.ts` — delade konstanter för error-koder mellan frontend/edge

**Filer som ändras (frontend):**
- `src/i18n/locales/sv.json` + `en.json` — nytt `errors`-namespace (~40-50 nycklar)
- ~20 komponenter/sidor från listan ovan — ersätt `toast.error`-strängar

**Filer som ändras (edge):**
- `test-smtp`, `connect-smtp-account`, `send-email`, `generate-sequence`, `improve-step`, `analyze-company`, `sync-inbox`, `launch-sequence`, `oauth-callback` — strukturerade fel-payloads med `code`

**Inte med:**
- Ingen DB-ändring, ingen RLS-ändring
- Inga ändringar i OAuth-scope eller affärslogik
- Email-mall-texter (separat scope)
- Felmeddelanden i edge function-loggar (server-only, påverkar inte användaren)

**Riskområde:** Edge function-svars-shape ändras (`error: string` → `error: { code, message, detail }`). `toUserMessage` måste hantera båda formaten under övergången så vi inte bryter andra konsumenter.

---

## Föreslagen ordning (om du vill dela upp)
1. i18n-nycklar + `errorMessages.ts` (grunden)
2. SMTP/anslutning + Auth (störst impact)
3. AI-flöden + Send-email
4. Lead-import + resten

Säg till om du vill köra allt i ett svep, eller bara steg 1–2 nu.
