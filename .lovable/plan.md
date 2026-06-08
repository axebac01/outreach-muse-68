
# Prissättning & paketering — MailLead.ai

## Marknadsanalys (kort)

Konkurrenter (USD, ungefärligt — SEK efter +moms/marginal):
- **Instantly** Growth $47 / Hypergrowth $97 — 1 000–25 000 kontakter, 5 000–100 000 mejl/mån
- **Smartlead** Basic $59 — 6 000 mejl + 2 000 prospect-credits
- **Lemlist** $39–$69/user — per-seat, begränsade sending-konton
- **Apollo** $0,05–0,10 per email-reveal-credit i volym

Insikter:
1. Marknaden går från **per-seat → flat per workspace** med obegränsade sending-konton.
2. **Leads/data-credits** är separerade från sändning (det vi redan gör — bra).
3. AI-mejl positioneras numera som ”ingår” snarare än som credit-konsument.
4. SaaS-prospects i Sverige tål 30–40 % premium mot USD-listpris pga moms, support på svenska, GDPR-fit.

Vår sweet spot: svenska B2B-team som vill ha **personligt** (kvalitet) snarare än volym. Vi ska INTE racea till botten på mejl-volym — vi tar betalt för relevans + svensk data.

## Rekommenderad paketering

### Tre publika planer + Enterprise

| | **Free** | **Starter** | **Growth** ⭐ | **Scale** |
|---|---|---|---|---|
| Pris | 0 kr | **490 kr/mån** | **1 290 kr/mån** | **2 990 kr/mån** |
| Pris/år (–20 %) | — | 4 700 kr | 12 380 kr | 28 700 kr |
| Inkluderade credits/mån | 50 (engång) | **500** | **2 000** | **6 000** |
| ≈ leads/mån (2 cr/reveal) | ~25 | ~250 | ~1 000 | ~3 000 |
| Sending-konton | 1 | 3 | 10 | 25 |
| Aktiva kampanjer | 1 | 3 | Obegränsat | Obegränsat |
| AI-mejl & sekvenser | ✓ obegränsat | ✓ obegränsat | ✓ obegränsat | ✓ obegränsat |
| Warm-up / deliverability-check | ✓ | ✓ | ✓ | ✓ |
| Unibox + svarsklassning | ✓ basic | ✓ | ✓ + AI-intent | ✓ + AI-intent |
| A/B-test sekvenssteg | — | — | ✓ | ✓ |
| Schemaläggning + sändfönster | basic | ✓ | ✓ avancerat | ✓ avancerat |
| Anpassad spårningsdomän | — | — | ✓ | ✓ |
| Team-seats | 1 | 1 | 3 | 10 |
| API + webhooks | — | — | — | ✓ |
| CSV-export | — | ✓ | ✓ | ✓ |
| Support | Community | E-post 48 h | Prio chatt 24 h | Dedikerad CSM |
| Topp-up credits | — | ✓ | ✓ | ✓ |

**Enterprise** (offert): SSO/SAML, DPA & dedikerad miljö, custom volym, on-prem IP-pool. Riktpris från 6 900 kr/mån.

### Credit-toppups (utöver plan, för alla betalplaner)

| Paket | Pris | Pris/credit | Använd som |
|---|---|---|---|
| 500 credits | 490 kr | 0,98 kr | Snabb påfyllning |
| 2 000 credits | **1 690 kr** | 0,85 kr | Populärast |
| 10 000 credits | 7 490 kr | 0,75 kr | Kampanjer |
| 25 000 credits | 16 990 kr | 0,68 kr | Byråer |

- Plan-credits **rullar över i 2 mån** (mjuk buffert), topp-up-credits gäller **12 mån**.
- Topp-up-credits konsumeras **efter** plan-credits.
- Alla priser exkl. moms.

### Vad en credit kostar (transparent)

| Aktion | Credits |
|---|---|
| Reveal av verifierad B2B-mejl | 2 |
| Reveal av direktnummer (framtid) | 5 |
| AI-genererat mejl/uppföljning | **0** (ingår) |
| Skicka mejl via anslutet konto | **0** (ingår) |
| Importera egen CSV-lead | **0** (ingår) |
| Re-reveal (samma lead) | 0 |
| Refund vid bouncad / felaktig data | Automatisk |

## Logiken bakom siffrorna

- **Free → Starter-konvertering:** 50 gratis-credits = ~25 leads = exakt en första kampanj. Triggar köp när det fungerar.
- **Starter 490 kr** matchar Lemlist Email-entry men inkluderar 250 leads (Lemlist har 0). Lägsta tröskel för en solo-säljare.
- **Growth 1 290 kr** är ankarpunkten (90 % förväntas hamna här). 2 000 credits = en realistisk månadspipeline för en SDR. Marginal: credit-COGS ~0,15 kr → ~85 % bruttomarginal.
- **Scale 2 990 kr** = byråer + säljteam, motiverar API och 25 sending-konton.
- **Topp-ups** prissatta **strikt högre per credit än planen** (plan ger 0,65–0,98 kr/credit, topp-up börjar på 0,98) → planen är alltid bästa dealen.
- **Årsplan 20 % rabatt** = standard SaaS-mekanik, höjer LTV och cashflow.

## Konkreta ändringar i produkten

### Innehåll / copy
- `src/i18n/locales/sv.json` + `en.json`: ersätt nuvarande `pricing.*` med tre planer + Enterprise-CTA, ny feature-matris, ny FAQ-rad om credits vs plan.
- `public/llms.txt`: uppdatera pris-sektionen.

### UI
- `src/pages/Pricing.tsx`: layout 3 kolumner (Free / Starter / Growth / Scale i 4-kol på desktop, Free som sekundär), månads-/års-toggle, separat "Credit-toppups"-block under planerna med 4 kort, "Behöver mer? Kontakta sales" Enterprise-banner.
- `src/pages/LeadsCredits.tsx`: justera de tre topp-up-paketen till 500 / 2 000 / 10 000 / 25 000 enligt tabellen, ny badge "Populärast" på 2 000.
- Liten "Credits ingår i din plan"-info i credit-vyn.

### Backend / data
- `src/hooks/useUsage.ts`: utöka `LIMITS` med `starter` (paid), `growth`, `scale` — fält: `campaigns`, `sendingAccounts`, `seats`, `monthlyCredits` (informativt; faktiskt saldo styrs av `credit_wallets`).
- Lägg till plan-tilldelning av månads-credits via befintlig `add_credits` RPC i `payments-webhook` (ny case för subscription-renewal med `reason: "plan_grant"`). Carry-over-logik: rensa plan-credits äldre än 60 dagar i en nattlig cron (kan göras i sprint 2).
- Stripe: skapa nya produkter `starter_monthly/yearly`, `growth_monthly/yearly`, `scale_monthly/yearly` + 4 nya credit-pack-prices. Behåll befintlig `growth_monthly` som migrations-väg för redan-betalande.
- Nya credit-pack-priceIds: `credits_500_sek` (justera pris 490), `credits_2000_sek` (1690), `credits_10000_sek` (7490), `credits_25000_sek` (16990) — kräver uppdatering av `CREDIT_PACKAGES`-mappen i `supabase/functions/create-credit-checkout/index.ts`.

### Migrationsplan för existerande Growth-kunder
- Befintliga 990 kr/mån-kunder: **grandfather** i 12 mån, sedan auto-migrering till nya Growth 1 290 kr med 30 dagars förvarning + erbjudande om årsplan till gamla priset.

## Vad jag vill bekräfta innan bygg

1. **Pris-nivåer ok?** 490 / 1 290 / 2 990 kr/mån — eller vill du köra aggressivare entry (t.ex. 290 kr) eller högre ankare (1 490 kr)?
2. **Free-planen:** 50 engångs-credits + 1 kampanj, eller vill du köra "credit-card-free trial 14 dagar" istället?
3. **Credit/reveal-kostnad** ligger kvar på 2 credits/lead, eller höja till 3 för att skydda marginalen på topp-ups?
4. **Enterprise-CTA:** ska den finnas synligt på pris-sidan eller bara nås via Kontakt?

Svara på dessa fyra så implementerar jag hela paketeringen (copy + UI + Stripe-produkter + webhook) i ett svep.
