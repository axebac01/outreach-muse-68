
## Ändringar

### 1. `src/components/ConnectEmailDialog.tsx` — providerlistan
- Lägg till en **"Rekommenderad"**-badge på den befintliga Microsoft OAuth-knappen (samma stil som "Recommended"-taggen som idag används på Gmail-raden, bredvid den existerande "One-click"-badgen).
- Direkt under Microsoft-knappen: lägg till en **inaktiv Google OAuth-knapp** med samma layout som Microsoft-knappen men:
  - `disabled` (inte klickbar), dämpad opacitet, `cursor-not-allowed`
  - Google "G"-färgad SVG-ikon
  - Titel: "Google (Gmail)" + en grå badge **"Under utveckling"**
  - Beskrivning: kort förklaring att ett-klicks-inloggning med Google kommer snart
  - Ingen `ChevronRight` (eftersom den inte är klickbar)

### 2. `src/lib/emailProviders.ts`
- Ta bort `recommended: true` från Gmail-posten (Microsoft tar över rollen som rekommenderad). Den befintliga Gmail-app-lösenord-raden lämnas orörd i övrigt och förblir gömd bakom `VITE_ENABLE_GOOGLE_OAUTH`-flaggan precis som idag.

### 3. i18n — `src/i18n/locales/{sv,en}.json`
Lägg till nya nycklar under `emailAccounts.providerPicker`:
- `recommended` återanvänds (finns redan)
- `googleLabel` → "Google (Gmail)" / "Google (Gmail)"
- `googleDesc` → "Ett-klicks-inloggning med Google" / "One-click sign-in with Google"
- `comingSoon` → "Under utveckling" / "In development"

## Vad ändras INTE
- Ingen ny backend, inga edge functions, inga nya rutter.
- `oauth-start`-funktionen och Microsoft-flödet rörs inte.
- Gmail-app-lösenord-guiden ligger kvar (men utan "Rekommenderad"-badge och fortfarande dold som idag).
- Ingen logik kring själva Google OAuth-inloggning byggs — knappen är rent visuell/inaktiverad.
