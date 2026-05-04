## Mål
Lyfta ut "Mejlkonton" till en egen toppnivå-sida i det inloggade läget, så den ligger som en egen sektion i navigeringen (inte gömd inne i Inställningar).

## Vad som finns idag
- Sidan `EmailAccounts.tsx` finns redan på route `/settings/email-accounts` och nås via ett kort i `Settings.tsx`.
- I `Navbar.tsx` (inloggat läge) finns idag: Dashboard | Ny kampanj | ⚙ Settings | Språk | Logga ut.
- Ingen synlig topp-nivå-länk till mejlkonton.

## Ändringar

### 1. Ny route: `/email-accounts`
- I `src/App.tsx`: lägg till `<Route path="/email-accounts" element={<ProtectedRoute><EmailAccounts /></ProtectedRoute>} />`.
- Behåll `/settings/email-accounts` som redirect till `/email-accounts` så gamla länkar inte går sönder.

### 2. Uppdatera `EmailAccounts.tsx`
- Ta bort "tillbaka till Settings"-länken högst upp (sidan är inte längre en undersida).
- Justera `Link to="/settings"` → ta bort breadcrumben helt, eller byt till en enkel rubrik-only header.

### 3. Navigering i `Navbar.tsx` (inloggat läge)
Lägg till en egen länk "Mejlkonton" i app-headern, mellan "Ny kampanj" och Settings-ikonen:
```
Dashboard | Ny kampanj | Mejlkonton | ⚙ | 🌐 | Logga ut
```
- Använd `Mail`-ikonen + text, eller bara textlänk i samma stil som "Dashboard".
- Markera aktiv route via `useLocation` (samma mönster som redan används med `isApp`).
- Inkludera `/email-accounts` i `isApp`-checken så app-headern visas på sidan.

### 4. Uppdatera `Settings.tsx`
- Ta bort kortet "Mejlkonton" som länkar till `/settings/email-accounts` (det blir en egen sida nu) — eller behåll som genväg. **Förslag:** ta bort, eftersom användaren uttryckligen vill ha det som egen sektion.

### 5. Översättningar (`src/i18n/locales/sv.json` + `en.json`)
- Lägg till `nav.emailAccounts` ("Mejlkonton" / "Email accounts").

## Filer som ändras
- `src/App.tsx` — ny route + redirect
- `src/components/Navbar.tsx` — ny nav-länk + utöka `isApp`
- `src/pages/EmailAccounts.tsx` — ta bort breadcrumb
- `src/pages/Settings.tsx` — ta bort mejlkonton-kortet
- `src/i18n/locales/sv.json`, `en.json` — ny nav-nyckel

## Frågor innan jag bygger
1. Vill du **behålla** genvägen i Settings också, eller ta bort den helt nu när det är en egen toppnivå-sida?
2. Ska nav-länken visa **ikon + text** ("📧 Mejlkonton") eller bara **text** i samma stil som "Dashboard"?

Om du bara säger "kör" tar jag bort genvägen i Settings och använder text-länk (matchar Dashboard-stilen).
