# Mål

Uppgradera `/inbound` coming soon-sidan med en snygg mockad förhandsvisning som teasar exakt hur produkten kommer att se ut — företag som besökt sajten, sidor de tittat på, signaler.

## Layout (top → bottom)

1. **Hero (kompakt)**
   - Badge "Beta · Kommer snart" (behåll pulserande prick)
   - H1: "Vet vilka företag som besöker din sajt"
   - Underrubrik: kort förklaring + "Notifiera mig"-knapp
   - Sekundär knapp: "Se hur det fungerar" (scroll-to nedan)

2. **Mock dashboard preview** (huvudgreppet)
   En realistisk-utseende widget i en `<div>` med inramning som ser ut som en produkt-screenshot — ovanpå läggs en subtil gradient overlay och en flytande "Förhandsvisning"-pill för att signalera att det är mockup.
   
   Layout inuti: 2 kolumner
   - **Vänster (60%): "Senaste företagsbesök"** — lista med 5 rader:
     - Logo (initialer i färgad cirkel) · Företag · stad/bransch · "tittade på X sidor" · tid sedan
     - Varma signaler markeras med en liten flammande/grön indikator
     - Exempelrader: Spotify · Stockholm/Music · 4 sidor · 2 min sedan (🔥 het) · Klarna, Volvo, IKEA, mindre okänt företag
   - **Höger (40%): "Mest besökta sidor"** — mini-bar chart (CSS-divar, ingen lib): /pricing 47, /features 31, /demo 22, /about 14, /blog/seo-guide 9
   - **Längst ner: "Aktivitet idag"** — sparkline (SVG path inline) + nyckeltal: "127 besök · 34 unika företag · 8 kända leads"

3. **3 feature-cards** — behåll som idag (Företagsidentifiering, Lead-matchning, Smart prioritering) men polera till matchande visuell vikt.

4. **Use cases-rad** ("Perfekt för…") — 3 chips/pills: Sales · Marketing · ABM-team.

5. **Footer-not** — diskret rad "Vi bygger Inbound just nu…" (behåll).

## Visuell polish

- Mock-widgeten får en svag inner-glow och `bg-gradient` topplist för att kännas levande.
- Animation: rader fade-in:ar med stagger (Tailwind `animate-fade-in` + delay via inline style — eller bara enkel CSS keyframe i index.css om saknas). Håll lätt — inga nya deps.
- Sparkline: ren SVG `<path>` med stroke `hsl(var(--primary))`, fill gradient mot transparent.
- Företagsavatarer: cirkel med initialer på `bg-primary/10 text-primary`, varierande hue via inline `style` (`hsl(--primary)` rotation) — håll inom design tokens.
- Het-indikator: liten `Flame`-ikon i `text-orange-500` ELLER bara en pulserande prick i primary för att hålla token-system.
- Hela mock-blocket: `rounded-2xl border bg-card shadow-xl` med subtil "browser chrome" topp (tre prickar + fake URL `app.maillead.io/inbound`) för att förstärka "produkt-shot"-känslan.

## Teknik

- En enda fil: `src/pages/Inbound.tsx`.
- Ingen DB, inga edge functions, inga nya beroenden.
- All mockdata som consts i filen.
- Använd existerande UI: `Badge`, `Button`, ikoner från `lucide-react` (Radar, Building2, Target, Sparkles, Bell, Flame, TrendingUp, Eye, ArrowUpRight, Globe).
- Endast semantiska tokens (`primary`, `muted`, `card`, `border`, `foreground`, `muted-foreground`). Inga råa färger förutom ev. `text-orange-500` för het-flamma — alternativt byt till `text-primary` för full konsistens.
- Responsivt: mock-widgeten staplar till en kolumn på mobil.

## Verifiering

1. `/inbound` → ser mockad dashboard med företagsbesök, sidstatistik, sparkline. ✅
2. "Notifiera mig" → toast. ✅
3. Mobil (~375px): allt staplar prydligt. ✅
4. Inga konsolfel, inga nya deps. ✅