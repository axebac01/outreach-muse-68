## Lägg till en interaktiv jordglob i Heroen

Vi byter ut det "req/s"-baserade exemplet mot en variant som visar mejl som skickas mellan städer runt om i världen. Globen läggs in i hero-sektionen på landningssidan, under CTA-knapparna.

### Vad som byggs

1. **Ny komponent `src/components/ui/globe-emails.tsx`**
   - Bygger på `cobe`-biblioteket (3D globe i canvas).
   - Renderar en ljus jordglob som passar vårt vita/blå tema (markerColor och arcColor sätts till primärblå istället för svart).
   - Roterar automatiskt, går att dra med musen för att rotera manuellt.
   - 10 markörer för städer: New York, San Francisco, Paris, Tokyo, Sydney, São Paulo, Singapore, Stockholm, Dublin, Mumbai.
   - 6 båglinjer mellan städer som visualiserar mejl som skickas.
   - Istället för "420k req/s"-etiketter visar vi små badges med t.ex. **"✉ 1 240 mejl/min"**, **"✉ 860 mejl/min"** osv. Värdena tickar långsamt upp/ned för att kännas levande.
   - Varje stadsmarkör får en liten etikett med stadsnamn (t.ex. "Stockholm") istället för regionkoder ("arn1").

2. **Hero-uppdatering i `src/pages/Landing.tsx`**
   - Behåller badge, rubrik, underrubrik, CTA-knappar och "no credit card"-texten.
   - Under CTA-knapparna lägger vi globen, centrerad, i ungefär 480×480 px (responsiv: full bredd upp till `max-w-lg` på mobil, `max-w-xl` på desktop).
   - Vi tar bort den nuvarande pulserande blå "blob"-bakgrunden bakom heron eftersom globen blir den nya visuella tyngdpunkten. Den mjuka gradient-bakgrunden får vara kvar.
   - Padding på hero-sektionen justeras något (`py-20 md:py-28`) så att globen får plats utan att sidan blir överdrivet hög.

3. **Översättningar i `src/i18n/locales/en.json` och `sv.json`**
   - Ny nyckel `landing.globeCaption` t.ex. "Live: emails being delivered around the world" / "Live: mejl skickas just nu världen runt", som visas som liten text under globen.
   - Enhet för traffic-badges: `landing.emailsPerMin` = "mejl/min" / "emails/min".

4. **Beroende**
   - Lägger till `cobe` i `package.json`.

### Tekniska detaljer

- Komponenten är client-side only (canvas + requestAnimationFrame). Den fungerar direkt i Vite/React utan extra konfiguration.
- Färger anpassas till vårt tema: `markerColor` och `arcColor` använder primärblå `[0.13, 0.45, 0.95]` (matchar `--primary: 221 83% 53%`), `glowColor` ljusgrå/vit, `baseColor` vit. Det gör att globen smälter in på den ljusa hero-bakgrunden istället för att vara svart-på-svart.
- Etiketterna positioneras med samma "CSS Anchor Positioning"-trick som original-snippeten — fungerar i moderna Chromium-baserade webbläsare. För webbläsare som inte stöder anchor positioning faller etiketterna tillbaka till `opacity: 0` (osynliga), vilket är okej eftersom själva globen + bågarna fortfarande syns.
- Vi tar bort de delar av original-koden som var trasiga i klistret (pyramid-ikoner, malformade JSX-fragment) och behåller bara enkla badges med text.
- Drag-att-rotera och paus-vid-drag behålls.
- Animationen pausas via `IntersectionObserver` när heron scrollas ut ur view för att spara CPU.

### Filer som ändras / skapas

- skapa `src/components/ui/globe-emails.tsx`
- ändra `src/pages/Landing.tsx` (hero-sektion)
- ändra `src/i18n/locales/en.json` (2 nya nycklar)
- ändra `src/i18n/locales/sv.json` (2 nya nycklar)
- ändra `package.json` (lägg till `cobe`)

### Verifiering efter implementation

1. Besök `/` utloggad → globen renderas, roterar, bågar animeras mellan städer, badges visar "X mejl/min".
2. Dra med musen → globen följer, släpp → autorotation fortsätter.
3. Resize fönstret → globen skalar utan layout-skift.
4. Inga konsolfel.
