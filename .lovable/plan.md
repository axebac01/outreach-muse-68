

## Lägg till svenska + språkväxlare (EN/SV)

### Mål
Användaren ska kunna växla mellan engelska och svenska via en flagg-knapp i navbaren. Hela appen översätts: landing, pricing, login/signup, dashboard, campaign-sidor, outreach, settings, navbar, knappar, toasts och dialoger.

### Approach
Använd **`react-i18next`** (industristandard, lättviktig, fungerar bra med Vite/React).

### Struktur

**1. Beroenden**
- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector` (auto-detektera webbläsarens språk första gången)

**2. Setup-filer (nya)**
| Fil | Innehåll |
|-----|----------|
| `src/i18n/config.ts` | i18next-init, registrerar resurser, default `en`, fallback `en`, persist via `localStorage` (`maillead-lang`) |
| `src/i18n/locales/en.json` | Alla engelska strängar, organiserat i namespaces (`common`, `nav`, `landing`, `pricing`, `auth`, `dashboard`, `campaign`, `outreach`, `settings`, `import`, `toasts`) |
| `src/i18n/locales/sv.json` | Samma struktur, svenska översättningar |
| `src/components/LanguageSwitcher.tsx` | Knapp i navbaren med flagg-emoji 🇬🇧 / 🇸🇪 + dropdown (eller toggle). Sparar val i localStorage |

**3. Initiering**
- Importera `./i18n/config` i `src/main.tsx` så det laddas innan App renderas

**4. Filer som ska uppdateras (ersätt hårdkodad text med `t('key')`)**
- `src/components/Navbar.tsx` — alla länkar/knappar + montera `<LanguageSwitcher />`
- `src/pages/Landing.tsx` — hero, features, how-it-works, testimonials, CTA, footer
- `src/pages/Pricing.tsx` — tier-namn, beskrivningar, features, FAQ, knappar
- `src/pages/Login.tsx` & `src/pages/Signup.tsx` — labels, placeholders, knappar, felmeddelanden
- `src/pages/Dashboard.tsx` — rubriker, tomma tillstånd, upgrade-meddelanden
- `src/pages/CreateCampaign.tsx` — formulärfält, valideringar
- `src/pages/CampaignDetails.tsx` — tabellhuvuden, knappar (inkl. "Import file", "Add Lead")
- `src/pages/Outreach.tsx` — rubriker, regenerate-knappar
- `src/pages/Settings.tsx` — alla labels och knappar
- `src/pages/NotFound.tsx`
- `src/components/EmptyState.tsx`, `UpgradeBanner.tsx`, `EmailCard.tsx`, `CopyButton.tsx`, `ImportLeadsDialog.tsx`, `ProtectedRoute.tsx`
- Alla `toast({...})`-anrop översätts via `t()`

### LanguageSwitcher UX
- Rund knapp i navbaren bredvid Logout / Try free
- Visar nuvarande språks flagga (🇬🇧 eller 🇸🇪)
- Klick öppnar liten dropdown med båda alternativen
- Val sparas i `localStorage` och appliceras direkt utan reload

### Översättningskvalitet (svenska)
- Naturlig svenska, inte ord-för-ord
- "Book more meetings" → "Boka fler möten"
- "Generate your first email — free" → "Skapa ditt första mejl – gratis"
- "Try free" → "Prova gratis"
- "Upgrade" → "Uppgradera"
- "Leads" behålls som lånord (vanligt i svensk B2B)
- "Outreach" → "Utskick"
- Behåll varumärket "MailLead.ai" oförändrat

### Det som INTE översätts
- AI-genererat innehåll (cold emails) — det styrs av prompten i edge-funktionen och bör hanteras separat senare
- Användarens egna data (lead-namn, anteckningar)
- Backend/databasfält

### Tekniska detaljer
- Namespaces lagras platt i en JSON per språk: `{ "nav": { "dashboard": "..." }, "landing": { ... } }`
- Användning: `const { t } = useTranslation(); t('nav.dashboard')`
- Språkdetektering: `i18next-browser-languagedetector` läser från localStorage först, sedan `navigator.language`
- Default till engelska om inget annat är satt
- Inga route-ändringar (`/en/...` eller `/sv/...`) — språk är globalt state, URL förblir oförändrad

