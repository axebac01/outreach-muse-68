
# Build-plan: gör prissidan sann genom att bygga, inte omformulera

Princip: behåll löftena på sidan och **bygg ikapp**. Strykningar bara där det inte är värt komplexiteten (t.ex. SSO/SAML stannar som "Kontakta oss"-deal, inte feature). Allt annat byggs.

Faser nedan är ordnade så vi kan launcha **efter Fas 2**. Fas 3–4 är polish.

---

## Fas 0 — Texträttelser som inte går att bygga bort (snabbt, ~15 min)

Bara en sak måste rättas oavsett: **subtitle/SEO säger "50 credits"** — vi har sänkt till 25. Ändra i `sv.json`, `en.json`, `Pricing.tsx`-SeoHead och `llms.txt`. Allt annat på sidan ska vi bygga ikapp nedan.

---

## Fas 1 — Credit-motorn (grunden för allt annat)

**Mål: 1 credit = 1 mejl är sant både till bokstav och i hur saldot beter sig — rollover, topp-up-giltighet, auto-refund.**

### 1A. Bucket-baserad credit-modell
Ersätt `credit_wallets.balance` med en `credit_buckets`-tabell:

```text
credit_buckets
- id, user_id
- kind: 'plan' | 'topup' | 'grant' | 'refund'
- amount_initial, amount_remaining
- granted_at, expires_at (nullable)
- source_ref (stripe_invoice_id / stripe_session_id / bounce_id)
```

- `spend_credits(user_id, amount, reason, lead_id)` plockar från äldsta-utgår-först (`ORDER BY expires_at NULLS LAST, granted_at`).
- `add_credits(...)` skapar en ny bucket med rätt `kind` + `expires_at`.
- `get_balance(user_id)` = sum(amount_remaining) där `expires_at > now() OR null`.
- `credit_ledger` behålls oförändrat (audit-trail).
- View `v_credit_balance` för UI så vi slipper räkna ihop i klienten.

### 1B. Expirering
Daglig cron som nollställer `amount_remaining` på buckets där `expires_at < now()` och loggar `reason='expired'` i ledger.

### 1C. Auto-refund vid bounce
Trigger på `bounces` insert (typ `hard_bounce`): hitta motsvarande `credit_ledger`-rad med `reason='reveal'` och samma `lead_id`, anropa `add_credits(kind='refund', amount=1)`. Idempotent via unik nyckel `(user_id, lead_id, 'bounce_refund')`.

### 1D. Re-reveal = 0 credits
Verifiera i `leads-reveal/index.ts` att samma `lead_id` för samma user inte debiterar igen. Om saknas, lägg till SELECT mot `credit_ledger` innan `spend_credits`.

---

## Fas 2 — Riktiga subscriptions (gör månadsplanerna sanna)

**Mål: Starter/Growth/Scale kan köpas direkt från sidan, månads- och årsvis, credits refillas automatiskt.**

### 2A. Stripe-produkter
Skapa via `payments--batch_create_product`:
- `plan_starter` → `starter_monthly` 29000 SEK, `starter_yearly` 230 × 12 = 276000 SEK
- `plan_growth` → `growth_monthly` 99000, `growth_yearly` 948000
- `plan_scale` → `scale_monthly` 249000, `scale_yearly` 2388000
- Tax code `txcd_10103001` (SaaS), `managed_payments` på (SE-konto, eligible).

### 2B. Subscriptions-schema
Standard `subscriptions`-tabell enligt Stripe-webhooks-mönstret (user_id, stripe_customer_id, stripe_subscription_id, price_id, status, current_period_end, cancel_at_period_end, environment).

### 2C. Edge functions
- `create-subscription-checkout` (embedded, ui_mode embedded_page).
- `create-portal-session` (för uppsägning/kortbyte).
- `stripe-webhook`-utbyggnad: `customer.subscription.*` + `invoice.payment_succeeded`.

### 2D. Credit-refill via webhook
Vid `invoice.payment_succeeded` (subscription): lägg in plan-credits enligt mappning `price_id → amount` med `kind='plan'` och `expires_at = now() + 60 days` (rollover-löftet uppfyllt automatiskt eftersom oanvända buckets fortfarande lever upp till 60 dagar).

### 2E. Topp-up får 12 mån
`create-credit-checkout` webhook: skapa bucket med `kind='topup'`, `expires_at = now() + 12 months`.

### 2F. UI
- Pricing.tsx: byt `mailto:`-CTA mot embedded checkout.
- Yearly toggle blir riktig (priserna ovan är redan 20 % billigare).
- Settings: "Aktiv plan" + "Hantera abonnemang" → portal.
- Ta bort "earlyAccess"-noten.

---

## Fas 3 — Enforced plan-gates (gör features-listorna sanna)

**Mål: limits som står på sidan är riktiga.**

### 3A. Helper
SQL-funktion `get_plan_limits(user_id) returns (max_campaigns, max_senders, max_seats)` baserad på senaste aktiva subscription. Free = 1/1/1, Starter = 3/3/1, Growth = ∞/10/3, Scale = ∞/25/10.

### 3B. Aktiva kampanjer
- Trigger på `campaigns` insert/update till status='active' som räknar och RAISEar om över gräns.
- UI: disable "Ny kampanj"-knapp + visa "Du har nått din planens gräns".

### 3C. Sändarkonton
- Samma trigger-mönster på `email_accounts`.
- Gate i `oauth-callback` och `connect-smtp-account` innan vi sparar.

### 3D. Team-platser (Growth 3 / Scale 10)
Nytt: `workspaces` + `workspace_members`-tabell, invite-flöde via mejl-länk, RLS på alla user-tabeller utökas att kolla membership. **Större jobb** — om vi vill ha det till launch, planera 1–2 dagar. Alternativt: lansera utan, ta bort "team-platser"-raden tills den finns.

→ Förslag: **strunta i team till v1**, ta bort raden från Growth/Scale features. Lägg till "Team-platser — kommer snart" i `creditUsage`-tabellen istället.

---

## Fas 4 — Premium-features

Kan göras parallellt efter launch om vi behöver pusha datum.

### 4A. A/B-test av sekvenssteg (Growth)
- `sequence_step_variants`-tabell (step_id, body, subject, weight).
- `process-scheduled-sends` väljer variant viktat.
- UI: variant-flik i `SequenceTab`.
- Statistik per variant i Analytics.

### 4B. AI-intent på svar (Growth) — varm/kall/avregistrerad
- Verifiera vad `analyze-inbound-email` returnerar idag.
- Lägg till bucket-output: `intent: 'warm' | 'cold' | 'unsubscribe'`.
- Spara i `email_threads.intent`, filtrera i Inbox.

### 4C. Anpassad spårningsdomän (Growth)
- Bekräfta `TrackingSettings` end-to-end (DNS-instruktioner, verify, signed CNAME).
- Plan-gate via `get_plan_limits`.

### 4D. Avancerad deliverability-monitoring (Scale)
- Cron som dagligen kör `check-deliverability` per anslutet konto.
- Historikvy + alert vid degradering.

### 4E. API + webhooks (Scale)
- Edge function `api/v1/*` (campaigns, leads, sequences) med `integration_api_keys`-auth.
- Webhook-events-tabell + `webhook-dispatcher` cron.
- Settings → Developer (API-nycklar finns redan, webhook-UI saknas).

### 4F. Enterprise
SSO/SAML/DPA byggs ad-hoc per kund — `mailto:`-CTA räcker.

---

## Föreslagen sekvens & tidsuppskattning

| Fas | Innehåll | Tid | Blockerare för launch? |
|---|---|---|---|
| 0 | "50→25" copy-fix | 15 min | Ja |
| 1 | Credit-buckets + rollover + topp-up-expiry + auto-refund | 1 dag | Ja |
| 2 | Subscriptions + checkout + portal + refill | 1–2 dagar | Ja |
| 3A–C | Plan-gates (campaigns + senders) | 0,5 dag | Ja |
| 3D | Team-seats | 1–2 dagar | Nej (skjut till v1.1, ta bort raden) |
| 4A | A/B-test | 1 dag | Nej |
| 4B | AI-intent | 0,5 dag | Nej |
| 4C | Tracking-domän verify | 0,5 dag | Nej |
| 4D | Deliverability-monitoring | 1 dag | Nej |
| 4E | API + webhooks | 2 dagar | Nej |

**Minimum för att inte ljuga vid launch: Fas 0 → 1 → 2 → 3A–C.** Fas 4 + 3D markeras "Kommer snart" i credit-tabellen tills de levereras (samma mönster som mobilnummer/deep research idag).

---

## Frågor innan vi börjar

1. **Team-platser** — bygger vi nu (Fas 3D = +1–2 dagar) eller skjuter till v1.1 och markerar "Kommer snart"?
2. **Fas 4** — vill du att jag börjar med någon av A/B-test, AI-intent, tracking-domän, deliverability eller API parallellt, eller kör vi strikt sekventiellt 0→1→2→3?
3. **Yearly -20 %** — godkänner du de exakta priserna 230 / 790 / 1 990 kr/mån (faktureras årligen)? De ligger redan i copy.

Säger du bara "kör" så börjar jag på Fas 0 + Fas 1 direkt.
