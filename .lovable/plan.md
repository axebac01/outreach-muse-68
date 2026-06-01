
# Outlook (Microsoft Graph) i produktion

Bra nyhet efter kartläggning: **all kod finns redan.** `oauth-start`, `oauth-callback`, `send-email` (`sendViaOutlook` via Graph `/me/sendMail`) och `sync-inbox` (Graph `/me/mailFolders/inbox/messages`) stödjer Microsoft sedan tidigare. Scopes är redan rätt: `Mail.Send`, `Mail.Read`, `Mail.ReadWrite`, `offline_access`, `User.Read`.

Det som saknas för launch är:
1. Microsoft-sidans konfiguration (görs av dig manuellt i Entra-portalen, gratis)
2. UI-arbete som lyfter Microsoft, döljer Google bakom feature-flagga, och hanterar consent-fel på svenska

---

## Del A — Manuell checklista i Entra/Azure (gör du)

Detta är gratis, tar ca 1–3 timmar totalt. Microsoft har **ingen motsvarighet till Googles CASA-granskning**.

### A1. Verifiera app-registreringen
Portal: <https://entra.microsoft.com> → Applications → App registrations → välj appen kopplad till `MICROSOFT_CLIENT_ID`.

- **Supported account types**: `Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)`. Detta krävs för att både jobb- och privatkonton (outlook.com, hotmail.com) ska kunna logga in.
- **Redirect URIs** (typ "Web"): lägg till produktions-URL och ev. custom domain, t.ex.
  - `https://<din-prod-domän>/oauth/callback`
  - behåll preview-URL för test
- **Client secret**: kontrollera att den inte går ut snart. Skapa en ny med 24 månaders giltighet om <6 mån kvar.
- **API permissions** (Microsoft Graph, Delegated): `openid`, `email`, `profile`, `offline_access`, `User.Read`, `Mail.Send`, `Mail.Read`, `Mail.ReadWrite`. Inga av dessa kräver admin consent globalt – men enskilda företagstenants kan kräva tenant-admin första gången.

### A2. Publisher Verification (rekommenderat, gratis)
Tar bort den röda "unverified app"-varningen vid samtycke.
1. Skapa Microsoft Partner Network-konto (Microsoft Cloud Partner Program, gratis tier): <https://partner.microsoft.com>
2. Verifiera tenant + domän (DNS-record eller automatiskt om du har Microsoft 365)
3. I app-registreringen → Branding & properties → **Publisher domain** + **Verified publisher** → fyll i MPN-ID
4. Vänta ~1 timme tills "Verified" syns

### A3. Branding
- Logga (240×240 PNG), produktnamn, supportlänk, ToS-URL och Privacy-URL (vi har `/legal/*`-sidorna redan). Visas i samtyckesrutan.

### A4. Throttling att känna till (ingen action, bara info)
- Graph send: ~30 msg/min, 10 000/dag per mailbox (mjuka gränser, vi loggar 429 redan i `email_send_log`).
- Inga "verification-needed"-varningar för dessa scopes – Microsoft ser dem som standard.

---

## Del B — Kod- och UI-ändringar (gör jag)

### B1. Feature-flagga bort Google
- Ny env: `VITE_ENABLE_GOOGLE_OAUTH` (default `false`).
- `ConnectEmailDialog` ProviderPicker: dölj Gmail-kortet helt när flaggan är av. Behåll Gmail-guide för app-password-flödet (kan fortfarande användas via "Custom").
- `oauth-start` edge function: returnera `{ error: { code: "google_oauth_disabled" } }` om `provider === "google"` och env-flagga `ENABLE_GOOGLE_OAUTH` är `false` (server-side, så ingen kan kringgå).

### B2. Lyfta fram Microsoft som primärt val
- `ProviderPicker`: Microsoft överst i en framhävd "Rekommenderat"-sektion med beskrivning *"Logga in med ditt Outlook/Microsoft 365-konto. Inga lösenord behövs."*
- Visa supported domains: outlook.com, hotmail.com, live.com, msn.com + "alla Microsoft 365-domäner".
- Behåll övriga (Yahoo, iCloud, Fastmail, Zoho, Custom) i en sekundär grid.

### B3. Bättre felhantering för consent-flöden
I `oauth-callback`, mappa Microsoft-fel till tydliga svenska/engelska meddelanden via befintlig `errorMessages.ts`:

| Microsoft-fel | Svensk text |
|---|---|
| `access_denied` / `consent_required` | "Du avbröt eller nekade åtkomsten. Försök igen och godkänn behörigheterna för att fortsätta." |
| `admin_consent_required` / `AADSTS65001` | "Din IT-administratör måste godkänna appen för din organisation. Skicka denna länk till admin: …" + auto-genererad `/adminconsent`-URL. |
| `AADSTS50020` (personligt konto i tenant-only-app) | "Detta Microsoft-konto stöds inte. Kontrollera att du loggar in med ditt jobb-/privat-Outlook." |
| `AADSTS7000218` (felaktig client secret) | "Konfigurationsfel i Outlook-anslutningen. Kontakta support." |
| Token expired/revoked vid send | "Outlook-anslutningen har gått ut. Klicka för att återansluta." |

### B4. Återanslutnings-UI
- I `/email-accounts`-listan: om en konto har `provider=outlook` och senaste send-försök gav `invalid_grant`/`401`, visa varningsbadge med "Återanslut"-knapp som startar samma OAuth-flöde med `prompt=login`.

### B5. i18n
Nya nycklar i `emailAccounts.providerPicker.microsoft.*` och `emailAccounts.errors.microsoft.*` i `sv.json` + `en.json`.

### B6. Dokumentation i app
Liten "Så funkar det"-tooltip vid Microsoft-knappen som förklarar att första inloggningen visar en Microsoft-samtyckesruta där användaren godkänner att appen får skicka och läsa mejl.

---

## Filer som påverkas

```
src/components/ConnectEmailDialog.tsx          (B1, B2, B6)
src/components/email/ProviderConnectGuide.tsx  (B6 ev.)
src/lib/emailProviders.ts                       (B2: Microsoft-preset metadata)
src/lib/errorMessages.ts                        (B3: Microsoft-felmappningar)
src/pages/EmailAccounts.tsx (eller motsv.)     (B4: återanslutnings-badge)
src/i18n/locales/sv.json, en.json              (B5)
supabase/functions/oauth-start/index.ts        (B1: server-side gate)
supabase/functions/oauth-callback/index.ts     (B3: mappa Microsoft-felkoder)
```

Inga DB-migrations behövs. Befintliga secrets (`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`) räcker.

---

## Leveransordning

1. **Du** börjar med Del A (Entra-portalen). Säg till när Publisher Verification är "Verified".
2. **Jag** kör B1–B6 i en iteration. Kan börja direkt – funkar mot preview redan, går live när du lagt till prod-redirect-URL i Entra.

Säg till om jag ska köra Del B nu eller vänta tills Del A är klar.
