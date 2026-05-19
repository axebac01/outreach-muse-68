## Verifiering: vad jag hittade

Jag gick igenom de nya filerna (`AppPasswordGuide.tsx`, `ConnectEmailDialog.tsx`) och kringliggande kod. Fyra konkreta saker:

### 1. 🔴 `outlook-app`-vyn är död kod
`ConnectEmailDialog` har en `view === "outlook-app"`-gren som renderar `<AppPasswordGuide preset={OUTLOOK_PRESET} …>`, men ingenstans i UI:t anropas `setView("outlook-app")`. Outlook-knappen går direkt till OAuth. Antingen ta bort grenen, eller (bättre) lägg till en fallback "Anslut Outlook med app-lösenord istället" som syns om OAuth misslyckas.

### 2. 🔴 `OUTLOOK_PRESET` fungerar inte för outlook.com/hotmail
Microsoft stängde av SMTP AUTH (basic auth) för **personliga** Outlook-konton i september 2024. `smtp.office365.com:587` med app-lösenord funkar fortfarande för **Microsoft 365 jobb/skola**, men endast om admin har aktiverat SMTP AUTH (vilket är avstängt by default). I praktiken kommer 90%+ av Outlook-användare få "535 5.7.139 Authentication unsuccessful" om de provar denna väg.

**Fix:** Ta bort `OUTLOOK_PRESET` helt (och därmed dead-code-grenen från #1). Outlook-användare ska enbart se Microsoft OAuth. Behåll generisk SMTP/IMAP-vägen för dem som faktiskt har egen Exchange/Office med SMTP AUTH påslaget.

### 3. 🟡 Gmail workspace-noten är missvisande
Texten säger *"admin måste tillåta 'Mindre säkra appar / App-lösenord'"* — men "Less secure apps" är en separat (utfasad) inställning. App-lösenord styrs av en **annan** Workspace-policy: *Security → Less secure apps* är borttaget; det som faktiskt blockerar är **2-Step Verification enforcement** + att Workspace-admin inte stängt av app-lösenord helt.

**Fix:** Skriv om till: *"Google Workspace-konton: 2-stegsverifiering måste vara aktiverat på ditt konto. Vissa organisationer har stängt av app-lösenord — fråga din IT-admin om det inte fungerar."*

### 4. 🟡 Google "Testing mode → re-auth var 7:e dag" — verifierad och korrekt
Bekräftat: `_shared/oauth.ts` begär `gmail.send`, `gmail.readonly`, `gmail.modify` — **restricted scopes**. I Testing-läge utgår refresh tokens efter 7 dagar. Varningen i UI:t stämmer. ✅

### 5. 🟢 i18n-inkonsekvens (kosmetiskt)
Nya `AppPasswordGuide.tsx` hårdkodar svenska strängar medan resten av appen kör `react-i18next`. Engelska användare ser då svenska i guiden. Inte kritiskt men borde åtgärdas.

**Fix:** Lägg till nycklar under `emailAccounts.appPassword.*` i `sv.json` + `en.json` och använd `t()` i guiden.

---

## Föreslagna ändringar

| Fil | Ändring |
|---|---|
| `src/components/ConnectEmailDialog.tsx` | Ta bort `view === "outlook-app"`-grenen + ta bort import av `OUTLOOK_PRESET` |
| `src/components/email/AppPasswordGuide.tsx` | Ta bort `OUTLOOK_PRESET`-export; uppdatera Gmail-`workspaceNote`; ersätt hårdkodade strängar med `t()`-anrop |
| `src/i18n/locales/sv.json` + `en.json` | Lägg till `emailAccounts.appPassword.*` (steg, knappar, fel-meddelanden, hjälptexter) |

## Verifiering efteråt
1. Build körs automatiskt — fångar typfel från borttagen export.
2. Manuell rök-test i preview: öppna "Anslut konto" → kolla att Gmail-guiden går igenom alla 3 steg + att Microsoft-knappen fortfarande startar OAuth.
3. (Valfritt) Kör `supabase--linter` för att se om något nytt råkat smyga in i RLS — men inga DB-ändringar gjordes så väldigt osannolikt.

## Inte med
- Ingen ändring av `connect-smtp-account` eller `test-smtp` edge functions.
- Ingen ändring av OAuth-scopes/flöde.
- Ingen tredje variant (Resend-relay etc.).
