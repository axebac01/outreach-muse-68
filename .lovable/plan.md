## Mål

Lägg till en pinnad scroll-sektion direkt under nuvarande hero som visar hela MailLead-flödet i 4 steg. Hero behålls oförändrad som teaser. Texten är sticky till vänster, mockupen byter visuellt till höger synkat med scrollens progress.

## Användarflöde i scroll-storyn

```
┌─────────────────────────────────────────────────────────┐
│  STEG 1  │  Hitta exakt rätt leads                      │
│  (sticky │  ICP-filter (titel, bransch, storlek) →      │
│   text)  │  resultatlista med "Avslöja"-knapp           │
├──────────┼──────────────────────────────────────────────┤
│  STEG 2  │  Importera till en kampanj                   │
│          │  Checkboxar tickas av en efter en, sticky    │
│          │  footer "Importera 4 leads" lyfts fram       │
├──────────┼──────────────────────────────────────────────┤
│  STEG 3  │  AI skriver kampanjen åt dig                 │
│          │  Prompt-input fylls i ("Sälj rekryterings-   │
│          │  tjänster till IT-företag"), sedan ström-    │
│          │  mande generering av 3 sekvenssteg           │
├──────────┼──────────────────────────────────────────────┤
│  STEG 4  │  Skicka — och få svar                        │
│          │  Mejl flyger iväg (kuvert-animation),        │
│          │  status flippar till "Skickat" → "Svarade",  │
│          │  liten analytics-chip räknar upp 23% svar    │
└──────────┴──────────────────────────────────────────────┘
```

Höjd: ca 4× viewport-höjd så varje steg får ~1 skärm scroll-utrymme. Sista frame släpper pinningen mjukt och övergår i nuvarande "Så funkar det"-sektion.

## Designprinciper

- **Behåller Aurora-estetiken** — samma färgtokens, samma glasmorfism, samma `Schibsted Grotesk`/mono. Inga nya färger eller fonter.
- **Vänster:** Eyebrow ("STEG 0X · TITEL"), stor rubrik, kort brödtext, 1–2 microbullets med ikoner. Sticky tills nästa steg tar över med crossfade.
- **Höger:** En enda "glass-stage" (samma stil som hero-mockupen) där innehållet morfar mellan stegen. Ingen tom canvas mellan stegen — animationen pågår alltid.
- **Progress-indikator:** 4 vertikala stickor till vänster om mockupen som fylls i takt med scroll. Klickbara för att hoppa direkt till ett steg.
- **Tempo:** ~80% av scroll-spannet visar steget i lugnt tillstånd, ~20% är morph-övergång till nästa. Inte för snabbt — användaren ska hinna läsa.

## Mobil-fallback (< 1024 px)

Pinning fungerar dåligt på mobil (höga sektioner = lång scroll utan progress-känsla). På mobil:
- Sektionen blir 4 staplade kort, ett per steg
- Varje kort animeras in när det scrollas in i viewport (samma `reveal` IntersectionObserver som finns idag)
- Mockup ovanför text i varje kort, statisk slutstate av animationen (ingen morph)

## Tekniskt

- Ny komponent `src/components/landing/ProductStory.tsx` som monteras i `AuroraLanding.tsx` direkt efter `</section>` på hero, före nuvarande "Så funkar det".
- Scroll-progress via `useScroll` + `useTransform` från **framer-motion** (redan i package.json — verifiera; annars `bun add framer-motion`).
- Pinning via `position: sticky` på höger glas-stage inuti en hög container. Ingen GSAP, ingen extern lib.
- Varje steg-mockup som egen komponent (`Step1Search`, `Step2Import`, `Step3AIWrite`, `Step4Send`) med interna keyframe-animationer styrda av en `progress`-prop (0–1) från parent.
- Stegens innehåll (mockad data, ICP-filter, prompt-text, mejlkroppar) ligger i en `storyContent.ts`-fil — lätt att redigera utan att röra logiken.
- `prefers-reduced-motion`: hoppar direkt till varje stegs slutstate utan morph, ingen kuvert-flygning.
- Stilen följer befintliga CSS-variabler i `#ml-aurora` — ingen ny global CSS, allt scopas i komponenten med Tailwind + inline `style`-tags.

## Avgränsning

- Hero och alla sektioner under "Så funkar det" rörs inte.
- Inga nya backend-anrop, inga riktiga data — allt är mockat i komponenten.
- Endast svensk text (matchar core memory).
- Bygger inte separat /demo-sida — bara förstärker landningssidan.

## Leveranskriterier

1. Scroll-pinnad sektion fungerar smooth i Chrome/Safari/Firefox desktop ≥ 1024 px
2. Mobil får staplad fallback utan pinning
3. `prefers-reduced-motion` respekteras
4. Inga regressions på hero, features, pris, FAQ
5. Lighthouse Performance-score för / faller inte mer än 3 poäng
