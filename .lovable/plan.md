# Plan: Steg 05 — Värde & analys

Lägga till en femte scen i ProductStory som landar hela storyn i konkret affärsvärde, inte bara "svar kom in".

## Konceptet

Scenen heter **"Resultat & pipeline-värde"** och visar:
- En **stor headline-siffra**: pipeline-värde i SEK (t.ex. "1,2 MSEK i pipeline").
- En **scroll-animerad graf** över 4 veckor som visar svar/möten/pipeline-värde som växer.
- **3 mini-stats** under: positiva svar, möten bokade, kostnad per möte.
- En lista med **3 "heta" svar** (riktiga namn från tidigare scener, t.ex. Sara Lind, Mona Ek) med korta svarscitat och en grön "Intresserad"-tag.
- **Diegetisk text** vid sidan: "Från kall lista till varm pipeline — automatiskt."

## Grafen

- SVG-baserad linje- + area-graf, 4 datapunkter (V1–V4).
- Stroke och fyllning interpoleras med scenens accentfärg (orange).
- Linjen ritas tecken-för-tecken via `stroke-dasharray` scrubbat på scrollens lokala progress (0→1).
- Area under linjen fade:ar in efter linjen är dragen.
- Datapunkter pop:ar in en i taget med liten ring-puls.
- Y-axel: dolda gridlinjer (svagt), X-axel: V1/V2/V3/V4-etiketter.
- En "ROI"-pil som pekar uppåt-höger med "+312%" som tonar in sist.

## Scen-flöde (lokal progress 0→1)

```text
0.00 – 0.15  Header + tom graf-ram fade:ar in
0.15 – 0.55  Grafens linje ritas, datapunkter pop:ar
0.55 – 0.70  Area-fyllning fade:ar in + ROI-pil
0.70 – 1.00  Mini-stats + 3 "heta svar" cascade:ar in
```

## Tekniska ändringar

- `src/components/landing/ProductStory.tsx`
  - Lägg till `STEPS[4]` (accent: guld/grön — guld `#D9920F` föreslås för "värde/pengar"-känsla).
  - Ny `Step5({ p })` med SVG-grafen + statsen + heta svar.
  - Uppdatera `STEP_COMPS` till 5 element.
  - Justera scrollhöjd: `height: 500vh` → `height: 600vh` (5 paneler).
  - Uppdatera `stepProgress` mapping `[0,1] → [0,5]`.
  - Uppdatera `trackX` mapping `[0,1] → ["0vw", "-400vw"]`.
  - Uppdatera `activeStep` cap från 3 → 4.
  - Lägg till nya CSS-klasser: `.ps-chart`, `.ps-chartwrap`, `.ps-hot`, `.ps-hotcard`, `.ps-roi`, `.ps-bigval`.
  - Rail-grid blir 5 kolumner istället för 4.
  - Mobile-fallback: lägg automatiskt till kortet (renderas från `STEPS.map`).

## Innehåll (svenska)

- Eyebrow: `STEG 05 · RESULTAT & PIPELINE`
- Titel: `Från kall lista till varm pipeline — automatiskt`
- Body: `Se exakt vad kampanjen genererat. Värde per svar, kostnad per möte och tydlig ROI — utan kalkylark.`
- Headline-siffra: `1,2 MSEK pipeline-värde`
- Mini-stats: `7 möten bokade` · `3 200 kr / möte` · `+312% ROI`
- 3 heta svar:
  - Sara Lind, Kavalan — "Intressant, kan vi ta ett snack på torsdag?"
  - Mona Ek, Tellus AB — "Vi letar faktiskt efter detta just nu."
  - Erik Holm, Northbeam — "Skicka gärna mer info."

Säg till om värdesiffrorna ska vara mer/mindre aggressiva eller om accenten ska vara grön istället för guld.
