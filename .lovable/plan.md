# Soft launch-plan: väntelista + SEO mot 15 augusti 2026

## Översikt
Tre delar som körs i ordning, alla enkla att rulla tillbaka i augusti:
1. **Väntelista istället för signup** (med countdown till 15 aug)
2. **SEO-grund** på landing + nya sidor
3. **2–3 SEO-landningssidor** för long-tail trafik

Login fortsätter fungera som vanligt — bara `/signup` styrs om.

---

## Del 1 — Väntelista & countdown

### Ny sida `/waitlist`
Egen route med samma Aurora-tema som landing. Innehåll:
- Hero med samma rubrik-stil (`.hh` + `.em`-gradient): "Vi öppnar **15 augusti**"
- Kort underrubrik: "MailLead.ai går live för alla i augusti. Säkra din plats nu — tidiga användare får 50 extra gratis-credits vid launch."
- **Countdown-komponent** mot `2026-08-15T09:00:00+02:00` — fyra cirklar (dagar/timmar/min/sek) med samma orange gradient som `.em` runt siffrorna, glas-effekt som matchar `.glass` i hero.
- **Formulär**: namn, e-post, företag (alla required, zod-validerade, max-längder). Submit-knapp `.btn-pri` "Säkra min plats".
- Efter submit: success-state med samma countdown kvar + "Vi mejlar dig 15 augusti".
- Liten footer-rad: "Är du redan registrerad? [Logga in](/login)".

### Datamodell
`launch_interest`-tabellen finns redan men saknar fält. **Migration** lägger till:
- `full_name text`
- `company text`
- `source text` (default `'waitlist_2026_august'`) — så vi enkelt kan filtrera vid launch
- Behåller `email + feature` unique-constraint; vi skickar `feature = 'waitlist'`

RLS-policyn för anon insert finns redan och fungerar oförändrat.

### Omdirigering av `/signup`
- `src/App.tsx`: byt `<Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />` mot `<Navigate to="/waitlist" replace />` bakom en feature-flag.
- **Feature-flag**: ny konstant i `src/config/launch.ts`:
  ```ts
  export const SOFT_LAUNCH_MODE = true; // sätt false 15 aug
  export const LAUNCH_DATE = new Date("2026-08-15T09:00:00+02:00");
  ```
  All UI som behöver veta läge läser från denna fil. Att gå live = ändra `true` → `false`.
- I `AuroraLanding.tsx`: knappar `/signup` → `/waitlist` när flaggan är på. Hero-CTA-text → "Säkra din plats inför launch".
- `/login` rörs **inte** — befintliga konton (du + testare) loggar in som vanligt.
- `Signup.tsx`-filen finns kvar oförändrad, så återgång = bara flippa flaggan.

### Navbar
"Prova gratis"-knappen → "Säkra plats" när `SOFT_LAUNCH_MODE` är på.

---

## Del 2 — SEO-grund

### On-page basics
- **`index.html`**: behålls som sitewide fallback. Uppdaterad `<title>`/`<meta description>`/`og:*` så de matchar nya hero-copyn ("Hitta nya B2B-kunder med AI-drivna utskick").
- **Per-route head**: `react-helmet-async` är redan installerat (`SeoHead`-komponenten används). Lägg till `<SeoHead>` på `/waitlist` (noindex tills launch — vi vill inte rangera på den), `/pricing`, och de nya SEO-sidorna.
- **Canonical/og:url**: säkerställ att alla sidor self-refererar via `SeoHead path`.
- **Sitemap**: `public/sitemap.xml` uppdateras med nya routes. (Statisk fil idag — vi rör inte mekanismen.)
- **robots.txt**: oförändrad (`Allow: /`).

### Kör SEO-scannern
Efter on-page-fixar: `seo_chat--trigger_scan`, åtgärda findings (typiskt H1-duplikat, alt-text, meta-längd), markera fixed.

---

## Del 3 — SEO-landningssidor

Tre svenska long-tail-sidor som siktar på sökintention vi vet matchar produkten:

1. **`/kalla-mejl`** — "Kalla mejl som B2B-säljare: guide + verktyg 2026"
2. **`/b2b-leads-sverige`** — "Köp B2B-leads i Sverige — så funkar det"
3. **`/e-postutskick-foretag`** — "E-postutskick till företag: regler, mallar & verktyg"

### Struktur per sida
- Återanvänd `Layout` + Aurora-stil för konsekvens.
- ~600–900 ord, semantisk H1/H2/H3, FAQ-block (samma `LANDING_FAQS`-mönster med JSON-LD).
- CTA i slutet → `/waitlist` (eller `/signup` efter 15 aug — feature-flag).
- `SeoHead` med unik titel/description/canonical + Article + FAQPage JSON-LD.
- Internlänkning från landing (footer eller en "Resurser"-rad) och mellan sidorna.

### Innehållskälla
Vi skriver copyn direkt i komponenterna (ingen CMS). Detta är ett medvetet val för soft launch — snabbt att skeppa, ingen extra infrastruktur.

---

## Återgång 15 augusti
En ändring: `SOFT_LAUNCH_MODE = false` i `src/config/launch.ts`.
Effekt: `/signup` återöppnas, alla CTA går tillbaka till "Prova gratis"/`/signup`, waitlist-sidan finns kvar på `/waitlist` (kan tas bort senare). SEO-sidorna stannar kvar — de är värdefulla efter launch också.

---

## Filer som ändras / skapas
**Nya:**
- `src/config/launch.ts` (feature-flag + datum)
- `src/components/Countdown.tsx`
- `src/pages/Waitlist.tsx`
- `src/pages/seo/KallaMejl.tsx`
- `src/pages/seo/B2bLeadsSverige.tsx`
- `src/pages/seo/EpostutskickForetag.tsx`
- `supabase/migrations/<ts>_launch_interest_extend.sql`

**Ändras:**
- `src/App.tsx` (routes + soft-launch-redirect)
- `src/components/AuroraLanding.tsx` (CTA-texter/länkar via flagga)
- `src/components/Navbar.tsx` om relevant
- `index.html` (titel/desc/og)
- `public/sitemap.xml`
- `src/integrations/supabase/types.ts` (auto-genererad efter migration)

## Frågor som inte behövs nu (jag antar)
- Countdown-design: matchar `.em` orange gradient + `.glass`-stil.
- Waitlist noindex: ja (vi vill inte att Google rangerar väntelistan över hemsidan).
- Bekräftelsemejl till anmälda: nej i v1 — bara success-state på sidan. Kan läggas till senare via edge-function om du vill.
