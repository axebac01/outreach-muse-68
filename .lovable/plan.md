
# Omtänk av credit-systemet

## Slutsats först

**Ja — gör om till "1 credit = 1 verifierad mejladress".** Och **nej**, vi ska *inte* dra credits för AI-mejl, sekvenser eller kampanjgenerering. Det är vår viktigaste positionering — att AI:n är "fri" att använda. Credits = **data**.

## Resonemang (kort)

### Varför 1 credit = 1 mejl

- **Mentalt enkelt:** "500 credits = 500 leads." Användaren behöver aldrig dividera med 3 för att räkna ut hur långt det räcker.
- **Marknadsstandard:** Apollo, ZoomInfo, Cognism, Surfe — alla prissätter "1 credit = 1 contact". Vi matchar förväntan.
- **Free-budskapet blir starkare:** "50 leads gratis" är begripligt direkt — "50 credits ≈ 16 leads" kräver en räknesnurra.
- **Säljkopia blir renare:** "Starter — 200 leads/mån för 290 kr (1,45 kr/lead)" är konkret.

### Varför AI INTE ska kosta credits

1. **Vår positionering** är "personligt AI-mejl per lead, i stor skala". Bygger vi en räknare som tickar varje gång AI:n skriver — bromsar vi exakt det vi säljer. Konvertering rasar.
2. **Friktion vid omgenerering:** Om varje "skriv om mejlet" kostar credits kommer användare ducka funktionen och få sämre output. Vår NPS sjunker.
3. **COGS är låg:** LLM-tokens på GPT-4o-mini-klass kostar ~0,05 kr per personligt mejl. På Growth (~750 leads × 3 mejl = 2 250 LLM-calls) = ~115 kr/mån vs. plan på 990 kr → fortfarande **>85 % bruttomarginal**.
4. **Konkurrenter (Instantly, Smartlead, Lemlist)** bakar in AI i plan — pris-konventionen är etablerad.
5. **Kampanjgenerering ("AI bygger sekvens åt mig")** är *hooket* som får folk att stanna efter free trial. Att straffa det med credits är att sabotera den första wow-upplevelsen.

### Vad credits *ska* täcka (nu och framtida)

Credits är **data-credits** — pris för information vi köper från en tredje part och betalar i USD per styck.

| Action | Credits | När |
|---|---|---|
| Verifierad B2B-mejladress | **1** | Idag |
| Direkt mobilnummer | **5** | När vi lägger till telefon (Apollo har detta som premium) |
| Avancerad ICP-research per lead (LinkedIn-aktivitet, intent-signaler) | **3** | Sprint efter telefonnummer |
| Företagsanrikning (techstack, finansiering) | **2** | Sprint efter ICP |
| AI-mejl, sekvens, kampanjgenerering, omgenerering | **0** | Idag och alltid |
| Skicka mejl, schemalägga, A/B-test | **0** | Idag och alltid |
| Re-reveal av samma lead | **0** | Idag |
| Refund vid bounce/felaktig data | **Automatisk** | Idag |

Modellen är **future-proof**: vi kan introducera nya betal-actions utan att bryta mental modellen "credits = data".

## Ny prissättning (justerad till 1 credit = 1 lead)

### Plan-credits

| Plan | Pris | Credits/mån | Pris per lead |
|---|---|---|---|
| Free | 0 | **25 engångs** | — |
| Starter | 290 kr | **200** | 1,45 kr |
| Growth ⭐ | 990 kr | **800** | 1,24 kr |
| Scale | 2 490 kr | **2 500** | 1,00 kr |
| Enterprise | offert | custom | från 0,80 kr |

**Justeringar gentemot förra paketet:**
- Free: 50 → **25** credits (motsvarar samma 16 leads-värde som tidigare, men siffran är ärlig)
- Starter: 500 credits / 165 leads → **200 credits / 200 leads**
- Growth: 2 000 / 665 → **800 / 800**
- Scale: 6 000 / 2 000 → **2 500 / 2 500**

Antal *leads* är ungefär oförändrat — bara skalan på credit-talet har ändrats.

### Credit-toppups

| Paket | Pris | Pris/credit | Använd som |
|---|---|---|---|
| 200 credits | 390 kr | 1,95 kr | Snabb påfyllning |
| **800 credits** | **1 390 kr** | **1,74 kr** | Populärast |
| 3 500 credits | 5 490 kr | 1,57 kr | Kampanj-boost |
| 10 000 credits | 13 990 kr | 1,40 kr | Byråer |

Regel som håller: **planen är alltid billigare per credit än motsvarande topp-up.**

### Hur Free funkar (med 25 credits)

- 25 verifierade leads + obegränsat antal AI-mejl + 1 kampanj + 1 sändarkonto.
- Räcker exakt till "första mini-kampanjen" → ser värde → konverterar till Starter.

## Vad som behöver ändras i koden

### Backend
- `supabase/functions/leads-reveal/index.ts`: `CREDITS_PER_REVEAL` **3 → 1**
- `supabase/functions/create-credit-checkout/index.ts`: nya paket-id:n + amounts (200/800/3 500/10 000)
- Migration: ändra default-balance **50 → 25**, justera signup-trigger + backfill för befintliga med saldo 50 → sätt till 25? Nej — **lämna befintliga oförändrade** (vore en sänkning), bara ny default för framtida users.
- Stripe-produkter: skapa fyra nya credit-pack-priser via `batch_create_product`. Behåll gamla 4 prices (de blir oanvända men ej raderade — historiska köp ska kunna återses).
  - Nya `lookup_keys`: `credits_200_sek`, `credits_800_sek`, `credits_3500_sek`, `credits_10000_sek_v2` (det sista måste byta nyckel — gamla `credits_10000_sek` har annat pris).

### Frontend
- `src/pages/LeadsCredits.tsx`: nya pack-data (4 paket), "≈ X leads" blir bara "X leads" (1:1), kopia "1 credit = 1 verifierad mejladress"
- `src/pages/Pricing.tsx`: justera credits-siffror per plan, ändra "≈ 16 leads" → "200 leads" (utan ≈ — 1:1), uppdatera topup-grid
- `src/i18n/locales/sv.json` + `en.json`: nya siffror i `pricing.plans.*.credits` / `leadsHint`, `pricing.topups.packs`, `pricing.creditUsage.rows` (visa "1 credit" + framtida actions som "Kommer snart"-rad så användare ser roadmap)
- `public/llms.txt`: uppdatera siffror

### Inget annat rörs
- AI-genererings-flöden, sekvensgenerering, kampanjbygge — **lämnas helt orörda** (de tar redan inga credits).

## Migrationsfråga (måste bekräftas)

Befintliga användare som har t.ex. 50 credits idag — med nya modellen är de värda **50 leads** istället för 16. Det är en **gratis uppgradering** för dem. OK eller vill du normalisera ner till 17?

→ **Mitt råd:** lämna saldon orörda. Det är generöst, billigt (få betas-användare), och vi slipper supportkö.

## Frågor innan bygg

1. **Modellen ok?** 1 credit = 1 mejl, AI alltid gratis, framtida data-actions prissätts i credits (telefon, research, anrikning)?
2. **Plan-credits ok?** Free 25 / Starter 200 / Growth 800 / Scale 2 500 — eller vill du justera (t.ex. Growth 1 000 för bättre marknadsföringssiffra)?
3. **Topp-up-priser ok?** 390 / 1 390 / 5 490 / 13 990 kr — eller justering?
4. **Befintliga saldon:** lämna orörda (gratis uppgradering) eller normalisera ner?

Svara på de fyra, så implementerar jag allt i ett svep.
