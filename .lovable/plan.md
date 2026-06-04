# Plan: Premium-uppgradering av ProductStory

Mål: göra scroll-storyn lika smidig och "wow" som Linear, Vercel, Arc, Framer och Stripe. Mindre "demo-mockup", mer cinematisk produktupplevelse.

## Vad de bästa sajterna gör (och vi inte gör idag)

1. **Horisontell pinning istället för vertikal stack** (Linear, Apple, Igloo Inc). Sektionen pinnas, innehållet glider i sidled mellan stegen. Känns som en film, inte en lång sida.
2. **Riktiga produkt-UI:n, inte symboliska mockups** (Vercel, Linear, Attio). Visa faktiska skärmar från appen — samma typsnitt, samma komponenter, samma färger som inne i produkten. Bygger trovärdighet direkt.
3. **Crossfade + parallax mellan steg** (Stripe, Framer). Gammalt UI bleknar/skalas ner och nytt glider in från höger med subtil parallax på inre lager (toolbar rör sig snabbare än bakgrund).
4. **Diegetisk text** (Arc, Rauno). Rubriker bor inuti scenen, inte i en separat textkolumn. Text och UI andas tillsammans.
5. **Mikromotion driven av scroll-progress, inte tid** (Linear). Cursorn flyttar sig, ett filter markeras, ett mejl skrivs — allt scrubbat med scroll. Användaren känner att de styr.
6. **En enda accentfärg per scen** med mjuk färgresa (orange → guld → grön → orange-glow). Bakgrundsgradient morfar långsamt.
7. **Tystnad mellan stegen** — 10–15% scroll där inget händer förutom andning/parallax. Ger rytm.
8. **Audio-cue alt. haptisk "tick"** vid stegövergångar (valfritt, av som default).
9. **Slut-payoff**: sista scenen zoomar ut till en dashboard som sammanfattar hela resan ("23 svar · 4 möten bokade"). Cliffhanger → CTA.

## Vad vi bygger

### A. Layout-byte: horisontell scrollytelling
- Sektionen blir `height: 500vh`, inre `position: sticky; height: 100vh`.
- Scen-container: `display: flex; width: 400vw`, translateX baserat på scroll-progress.
- Mobil: behåll vertikal stack (kortvariant), men polera (se D).

### B. Riktiga produkt-skärmar
- Återanvänd faktiska komponenter från `/leads`, `/campaigns/[id]`, `/inbox` i mini-format (read-only, mockad data).
- Wrappa i en "device frame" (subtil 1px border, top-bar med trafikljus-prickar, mjuk inner-shadow).
- Konsekvent skala 0.85 så de känns som "tittar in i appen".

### C. Cinematisk scene-direction
- **Scen 1 (Sök):** cursor glider in, klickar filter ett-efter-ett, leads tonar in rad-för-rad, "Avslöja mejl" pulsar och avslöjar.
- **Scen 2 (Importera):** checkboxar bockas i sekvens med liten "tick"-skala, footer-bar slidar upp, hela urvalet flyger i en båge mot kampanj-ikonen (motion path).
- **Scen 3 (AI):** prompt skrivs tecken-för-tecken (scroll-scrubbat, inte tid), sedan "thinking shimmer" på AI-knappen, sedan 3 mejlkort som bygger sig själva rad-för-rad med caret.
- **Scen 4 (Skicka & svar):** kuvert flyger ut i parabel mot inkorg-ikoner, status-chips morfar Queued→Sent→Replied, dashboard tonar in över med stora siffror (23 svar, 12% reply, 4 möten).

### D. Mikrodetaljer som lyfter känslan
- **Färgresa**: CSS-variabel `--scene-accent` interpoleras mellan stegen, driver glow, progress-rail och knapp-accenter.
- **Aurora-bakgrund** rör sig långsamt parallax (translateY * 0.3).
- **Grain-overlay** (4% opacity) för filmkänsla.
- **Progress-rail** byts mot en horisontell tunn linje längst ner med 4 steg-etiketter som highlightas. Mjuk spring-animation.
- **"Scroll" hint** byts till en subtil pil + "Scroll" som fadar efter första scrollen, Apple-stil.
- **Spring easing** (framer `useSpring` på scroll-progress) så allt känns viktat, inte linjärt.
- **Reduced motion**: hoppar direkt till sluttillstånd per scen, ingen pinning.

### E. Performance
- `will-change: transform` bara på aktiva lager.
- Tunga SVG/blur bara på desktop ≥1024px.
- Lazy-mounta scen 3 & 4 tills de är inom 1 scen-bredd från viewport.

## Tekniska detaljer

- `framer-motion`: `useScroll` + `useSpring({stiffness: 80, damping: 20})` för smooth scrub.
- `useTransform` på `scrollYProgress` → `translateX` på horisontell rail.
- Varje scen får en lokal `progress` (0–1) härledd från global progress via `useTransform`.
- Cursor och typing-animationer drivs av samma lokala progress (deterministiskt, reversibelt).
- Färg-interpolation via `useMotionTemplate` på CSS-variabel.
- Filer som ändras: `src/components/landing/ProductStory.tsx` (omskrivning), ev. ny `ProductStoryMobile.tsx` för att hålla filen läsbar.

## Vad jag rekommenderar du säger ja till

**Minsta möjliga "wow"-paket (det jag skulle göra först):**
1. Horisontell pinning (A)
2. Spring-easad scroll + färgresa (D)
3. Cursor-driven mikromotion i scen 1 + typing-scrub i scen 3 (C)
4. Slut-payoff dashboard i scen 4 (C)

**Full version:** ovan + riktiga produktkomponenter (B) + audio-cue + diegetisk text.

Säg vilken nivå du vill ha så bygger jag.
