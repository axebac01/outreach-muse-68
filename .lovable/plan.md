
# Typeform-style onboarding efter signup

## Översikt

En fullskärms, en-fråga-i-taget onboarding som triggas första gången en användare loggar in (när profilen saknar onboarding-data). Stora centrerade frågor, mjuk slide-up-övergång, progress bar i toppen, Enter går vidare. När användaren skriver in sin URL i steg 2 startar Firecrawl-scrape + AI-sammanfattning **i bakgrunden** så att slutskärmen kan visa ett "wow"-resultat utan väntan.

## Frågesteg

1. **Namn** – textinput
2. **Företags-URL** – textinput, `onBlur` startar scrape i bakgrunden
3. **Roll** – val: Säljare / Grundare / Marknad / Byrå / Annat
4. **Mål** – val: Boka möten / Hitta kunder / Sälja en tjänst / Rekrytera
5. **Volym/månad** – val: <500 / 500–5 000 / 5 000–20 000 / >20 000
6. **Erfarenhet** – val: Vet vad jag gör / Lite grand / Nybörjare
7. **Avsändare** – val: 1 / 2–5 / 6–10 / Fler
8. **Slutskärm (wow)** – "Vi hittade [Företag]. Ett bolag som hjälper [målgrupp] att [värde]. Vi skriver mejl som låter som att de kommer från er." Rad-för-rad fade-in, sen knapp "Kom igång" → `/dashboard`.

Om scrape misslyckas: fallback-textfält "Beskriv kort vad ditt företag gör" på slutskärmen istället för wow-texten.

## Tekniska ändringar

### 1. Databas (migration)
Utöka `profiles`:
- `onboarding_completed boolean not null default false`
- `role text`, `goal text`, `monthly_volume text`, `experience text`, `sender_count text`
- `company_url text`, `company_name text`, `company_description text` (AI-genererad 2-meningarssummering)
- `company_scrape_status text` ('pending' | 'done' | 'failed')

### 2. Connector
Länka Firecrawl-connectionen (`std_01kpdrazyaf419q4bseqpswykx`) till projektet via `standard_connectors--connect` så att `FIRECRAWL_API_KEY` blir tillgänglig server-side.

### 3. Edge function: `analyze-company`
- Input: `{ url }`
- Steg A: `POST https://api.firecrawl.dev/v2/scrape` med `formats: ['markdown','summary']`, `onlyMainContent: true` (Bearer `FIRECRAWL_API_KEY`)
- Steg B: skicka markdown/summary + sidans title till Lovable AI Gateway (`google/gemini-3-flash-preview`) med tool-calling för structured output: `{ company_name, target_audience, value_prop, two_sentence_summary }`
- Validera JWT, skriv resultatet direkt till `profiles` för `auth.uid()`, sätt `company_scrape_status='done'` (eller `'failed'` vid fel). Returnera resultatet.

### 4. Frontend

**`src/pages/Onboarding.tsx`** (ny, `/onboarding`, ProtectedRoute)
- En `step`-state (0–7), array med stegdefinitioner.
- Layout: full screen `min-h-screen flex flex-col`, `<Progress>` överst (steg/total*100), centrerat innehåll med `text-3xl md:text-5xl font-semibold tracking-tight`, hint "Tryck **Enter** ↵" under input.
- Övergångar: wrappa aktuellt steg i en motion-div med translateY(24px)+opacity → 0; använd Tailwind `animate-in slide-in-from-bottom-4 fade-in` keyad på `step`.
- Tangentbord: global `onKeyDown` på containern; Enter → `next()` om validering ok. För select-steg: siffertangenter 1–5 väljer alternativ + auto-advance efter 150 ms.
- URL-steg: `onBlur` (och vid Enter innan next) → kalla `supabase.functions.invoke('analyze-company', { body: { url }})` utan await på UI-tråden; uppdatera lokal `companyData`-state när promise resolvar. Sätt `company_scrape_status='pending'` direkt i profiles.
- Slutskärm: om `companyData` finns → visa wow-texten med staggerad fade-in (3 rader, 400 ms delay vardera). Om pending när användaren når slutet → visa "Vi analyserar ditt företag…" med pulserande dots tills datan kommer (timeout 10 s → fallback). Om failed → fallback textarea.
- "Slutför": uppdatera profiles med alla svar, `onboarding_completed=true`, navigera `/dashboard`.

**`src/components/OnboardingGate.tsx`** (ny)
- Läser profile via `useProfile`. Om `onboarding_completed=false` och vi inte redan är på `/onboarding` → `<Navigate to="/onboarding" replace />`.
- Wrappa `ProtectedRoute`'s children med denna gate (eller wrappa i `App.tsx` runt skyddade rutter), exkludera `/onboarding` själv.

**`src/App.tsx`**
- Lägg till `<Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />`.
- Lägg `OnboardingGate` runt övriga skyddade sidor.

**`Signup.tsx`**
- Efter lyckad signup → `navigate("/onboarding")` istället för `/dashboard`.

### 5. i18n
Lägg till `onboarding.*` nycklar (frågor, alternativ, hints, wow-text-mall) i `sv.json` och `en.json`.

## Filer som skapas/ändras

- **Ny**: `supabase/functions/analyze-company/index.ts`
- **Ny**: `src/pages/Onboarding.tsx`
- **Ny**: `src/components/OnboardingGate.tsx`
- **Migration**: utöka `profiles` (kolumner ovan)
- **Connector**: länka Firecrawl
- **Edit**: `src/App.tsx`, `src/pages/Signup.tsx`, `src/i18n/locales/{sv,en}.json`

Inga andra filer berörs.
