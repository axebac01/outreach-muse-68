
## Kartläggning

### Nuläge — vad användaren ser idag
- **`ConnectEmailDialog`** har 3 vägar: Gmail app-lösenord (steg-för-steg-guide), Microsoft OAuth, "Annat (IMAP/SMTP)" (rått formulär med 2 presets: Zoho, Fastmail).
- **`AppPasswordGuide`** är välpolerad för Gmail (3 numrerade steg, deeplinks till `myaccount.google.com/apppasswords` + 2-stegsverifiering, fält med hint, test innan save).
- **SMTP-vyn** är däremot ett "rått formulär": användaren måste själv veta host, port, TLS, IMAP-detaljer. Inga leverantörsspecifika instruktioner, ingen länk till var man hittar lösenord/inställningar, ingen förklaring av vad TLS/port betyder.
- **Felmeddelanden** är nu (efter förra paketet) tydliga och lokaliserade via `toUserMessage` + `errors.smtp.*` — det är en bra grund att bygga vidare på.

### Verklighetscheck inför launch (utan CASA)
- **Bortfaller helt vid launch:** Google OAuth (kräver CASA för restricted scopes). Endast app-lösenord finns kvar för Gmail.
- **Förblir:** Microsoft OAuth (Microsoft kräver inte CASA — bara consumer/MSA-konsent). Behåll som "ett-klick"-väg för Outlook/M365.
- **SMTP/IMAP blir huvudvägen** för: Gmail (app-lösenord), Yahoo, iCloud, Zoho, Fastmail, ProtonMail Bridge, Posteo, GMX, Mailbox.org, Office 365 med SMTP AUTH, egen Postfix/Exchange.
- **Personliga Outlook/Hotmail:** Microsoft stängde SMTP AUTH 2024 — vi blockerar redan i `test-smtp` och visar `errors.smtp.personalOutlookBlocked`. Behåll som väggvis (gå via Microsoft OAuth-knappen).

### Vad som gör SMTP "smärtsamt" idag
1. **Användaren vet sällan sin SMTP-server eller port** — vi listar bara 2 presets, resten får googla.
2. **App-lösenord är leverantörsspecifikt** — Yahoo/iCloud/Zoho/Fastmail har alla olika sätt att generera dem, ingen guide finns.
3. **Inga visuella ledtrådar** — användaren ser "Server"/"Port" som tomma fält utan att förstå att vi kan fylla i åt dem.
4. **IMAP-vyn säger "valfritt"** men appen behöver IMAP för inbox-sync — användaren förstår inte konsekvensen.
5. **Felmeddelanden är nu bra**, men proaktiva hint saknas (t.ex. "Yahoo kräver app-lösenord, inte ditt vanliga lösenord" innan användaren testar).
6. **Ingen autodetektering** — om användaren skriver `user@fastmail.com` borde host/port fyllas i automatiskt.

---

## Plan

### Steg 1 — Bygg ut leverantörskatalogen (kärnan)
Skapa `src/lib/emailProviders.ts` med ~12 leverantörer. Per leverantör:
- `id`, `label`, `logo` (svg/inline)
- `emailDomains: string[]` (för autodetektering: `["gmail.com", "googlemail.com"]`)
- `smtp_host`, `smtp_port`, `smtp_secure`
- `imap_host`, `imap_port`, `imap_secure`
- `requiresAppPassword: boolean` + `appPasswordUrl`, `twoFactorUrl`
- `appPasswordSteps: string[]` (3–5 korta numrerade steg på svenska)
- `helpDocUrl`
- `notes?: string` (varningar/särdrag, t.ex. iCloud kräver `@icloud.com`-adressen som användarnamn)

**Leverantörer som ingår:**

| Leverantör | App-lösenord | Notering |
|---|---|---|
| Gmail | Ja | Behåll befintlig guide; lägg in i katalogen |
| Google Workspace | Ja | Egen instruktion: admin måste tillåta app-lösenord |
| Yahoo Mail | Ja | Måste generera under "App passwords" |
| iCloud Mail | Ja | Generera på appleid.apple.com; använd `@icloud.com`-adressen |
| Fastmail | Ja | "App passwords" → "Mail (IMAP/SMTP)" |
| Zoho Mail | Ja | "Account → Security → App passwords" |
| ProtonMail | Bridge | Kräver Proton Bridge-app installerad lokalt — varnar |
| Posteo | Nej | Normalt lösenord funkar |
| Mailbox.org | Nej | Normalt lösenord funkar |
| GMX / Web.de | Ja | Aktivera "POP3/IMAP" först i webbinställningar |
| Office 365 (jobb/skola) | App-lösenord *eller* OAuth | Hänvisa till Microsoft-knappen som primärt |
| Egen domän (cPanel/Plesk/Postfix) | N/A | Generisk SMTP-formulär, hänvisa till webhotellets dokumentation |

### Steg 2 — Designa om provider-val (entry-vyn)
Ersätt nuvarande 3 knappar med en **leverantörsväljare** (sökbar grid):
- Stora ikoner i grid (4 per rad), klickbara → öppnar guide
- Sökfält på toppen ("Sök leverantör...")
- "Microsoft (OAuth)"-knapp ligger kvar som special, märkt "Ett klick — ingen konfig"
- "Annat / Egen domän" är sista valet — leder till generiskt formulär
- Tagg "Rekommenderas" på Gmail + Microsoft, "App-lösenord krävs" på Yahoo/iCloud osv.

### Steg 3 — Generisk `ProviderConnectGuide`
Refaktorera `AppPasswordGuide` → `ProviderConnectGuide` som tar emot vilken som helst leverantör från katalogen och renderar:

1. **Header** med logo + leverantörsnamn
2. **Innan du börjar** — sammanfattning: "Detta tar ~3 minuter. Du behöver: 2FA aktiverat + ett app-lösenord."
3. **Steg 1–N** numrerade, med deeplinks. Texter kommer från katalogen.
4. **Formulär** med endast 3 fält: mejladress, visningsnamn, app-lösenord. Host/port/TLS/IMAP fylls i automatiskt från katalogen, dolt bakom "Visa avancerat".
5. **Test + Spara** (samma flöde som idag, med våra nya `errors.smtp.*`-mappningar).
6. **Hjälp-länk** längst ner ("Det fungerar inte — visa felsökningstips" → expanderbar accordion med top-3 fel: fel app-lösenord, 2FA inte på, organisationen blockerar).

### Steg 4 — Autodetektering vid mejlinmatning
I generiska "Egen domän"-formuläret: när användaren skriver mejladress, slå upp domänen mot katalogen:
- Om träff → "Det här ser ut som ett Fastmail-konto. Vill du använda Fastmail-guiden istället?" + knapp
- Om ingen träff → fortsätt med generiskt formulär, men förifyll host som `mail.{domän}` + port 587 (vanligaste defaulten) som startgissning
- Bonus (out-of-scope för denna omgång): MX-lookup via edge function för att gissa host

### Steg 5 — Förbättra generiskt SMTP-formulär (för "egen domän"-användare)
- Inline-hjälp under varje fält: "Server: vanligtvis `mail.dindomän.se` eller `smtp.dindomän.se`. Hör med ditt webbhotell."
- Port-väljare som dropdown: `465 (SSL — rekommenderas)`, `587 (STARTTLS)`, `25 (osäkert)`
- "Använd samma värden för IMAP" som default-checkbox (förifyller imap_host = smtp_host med `imap.` istället för `smtp.`)
- Varnar visuellt om IMAP lämnas tom: "Utan IMAP kan vi inte synka inkommande svar — bara skicka."

### Steg 6 — Ta bort Google OAuth-knappen vid launch
- Idag ligger den bakom "Visa avancerade alternativ" med Testing-mode-varning.
- Lägg till en feature-flag `VITE_ENABLE_GOOGLE_OAUTH` (default `false` i prod). I .env för dev kan den vara `true` så vi kan testa OAuth-flödet.
- Backend (`oauth-start` för Google): returnera `{ error: { code: "google_oauth_disabled" } }` om flaggan är av (försvarsdjup).

### Steg 7 — i18n
Alla nya texter (leverantörsnamn, steg, hjälptexter, felsöknings-accordion) läggs i `emailAccounts.providers.*` i `sv.json` + `en.json`.

### Steg 8 — Lättgenomförda kvalitetslyft
- **Klistra-in-friendly:** Strippa mellanslag/radbrytningar från app-lösenordet automatiskt (görs redan för Gmail — generalisera).
- **"Visa lösenord"-knapp** med ögon-ikon på lösenordsfält.
- **Auto-test efter "Spara"** istället för två-stegs (testa+spara) — om test går igenom, spara direkt. Mindre friktion.
- **Success-state med nästa steg:** "Klart! Vill du testskicka ett mejl till dig själv?" → öppnar `SendTestEmailDialog`.

---

## Teknisk översikt

**Filer som skapas:**
- `src/lib/emailProviders.ts` — katalog (data + typer)
- `src/components/email/ProviderConnectGuide.tsx` — generisk guide (ersätter `AppPasswordGuide`)
- `src/components/email/ProviderPicker.tsx` — grid + sökruta
- `src/components/email/SmtpAdvancedForm.tsx` — utdragen från `ConnectEmailDialog` för "egen domän"

**Filer som ändras:**
- `src/components/ConnectEmailDialog.tsx` — slimmas ner till en wrapper kring `ProviderPicker` + `ProviderConnectGuide`/`SmtpAdvancedForm`
- `src/components/email/AppPasswordGuide.tsx` — tas bort (ersätts av `ProviderConnectGuide`)
- `src/i18n/locales/sv.json` + `en.json` — nya `emailAccounts.providers.*`
- `.env` + `src/components/ConnectEmailDialog.tsx` — `VITE_ENABLE_GOOGLE_OAUTH`-flagga
- `supabase/functions/oauth-start/index.ts` — feature-flag-check för Google

**Filer som INTE rörs:**
- `supabase/functions/test-smtp/index.ts` — redan bra (strukturerade felkoder från förra paketet)
- `supabase/functions/connect-smtp-account/index.ts` — fungerar generiskt redan
- `src/lib/errorMessages.ts` — redan på plats

---

## Rekommenderad sekvens (om vi delar upp)

**Iteration 1 (störst impact, ~30 min):**
- Steg 1: leverantörskatalogen (data)
- Steg 3: refaktorera `AppPasswordGuide` → `ProviderConnectGuide`, peka Gmail på katalogen
- Steg 2 (light): byt entry-vyn till en enkel lista med 4–5 leverantörer

**Iteration 2:**
- Steg 5: förbättra generiska SMTP-formuläret (port-dropdown, IMAP-hjälp)
- Steg 8: success-state + auto-test-on-save

**Iteration 3 (innan launch):**
- Steg 6: feature-flagga Google OAuth bort
- Steg 4: autodetektering från mejldomän
- Steg 2 (full): grid med ikoner + sökruta

**Inte med:**
- MX-lookup edge function (kan läggas till senare)
- Resend/Postmark-relay som tredje väg (eget paket)
- Sätta upp Lovable's egna `notify.<domän>`-emails — irrelevant här (det är för transaktionella mejl, inte för avsändarkonton).

Säg vilken iteration du vill att jag börjar med, eller om du vill att jag justerar leverantörslistan/ordningen först.
