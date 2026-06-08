
# Fas 2 — Subscriptions (slutgiltig plan)

Produktionsklart från dag 1. Sandbox används bara tills Stripe go-live är klart; samma kod fungerar för båda via `StripeEnv`.

## 1. Stripe-produkter

Skapas via `payments--batch_create_product`. Tax code `txcd_10103001` (SaaS).

| product_id | price_id | belopp (SEK öre) | intervall |
|---|---|---|---|
| `plan_starter` | `starter_monthly` | 29 000 | månad |
| `plan_starter` | `starter_yearly`  | 276 000 | år |
| `plan_growth`  | `growth_monthly`  | 99 000  | månad |
| `plan_growth`  | `growth_yearly`   | 948 000 | år |
| `plan_scale`   | `scale_monthly`   | 249 000 | månad |
| `plan_scale`   | `scale_yearly`    | 2 388 000 | år |

Efter skapande: `stripe.products.update(...)` för att sätta tax_code (verktyget stöder inte parametern i batch).

## 2. Databas

**Tabell `subscriptions`** (standard-mönstret):
```text
user_id, stripe_subscription_id (unique), stripe_customer_id,
product_id, price_id, status, current_period_start/end,
cancel_at_period_end, environment, created_at, updated_at
```
RLS: user ser sin egen. `service_role` gör allt. Helper: `has_active_subscription(user_id, env)`.

**Tabell `plan_credit_grants`** (kunskap om hur många credits per intervall):
```text
price_id PK, credits_per_month int, billing_interval ('month'|'year')
```
Seedas med 250/1000/3000 för båda intervall — yearly får alltså samma 250/mån men via cron istället för faktura.

**Tabell `subscription_credit_grants`** (idempotens-logg för månadsvis refill):
```text
subscription_id, period_start (date), granted_at, amount
UNIQUE(subscription_id, period_start)
```

## 3. Edge functions

- **`create-subscription-checkout`** — Embedded checkout, `mode:"subscription"`, `managed_payments:{enabled:true}`, resolver Customer via metadata.userId, sätter `subscription_data.metadata.userId`. `verify_jwt = false`, JWT valideras i kod för att hämta user.
- **`create-portal-session`** — Stripe Billing Portal. JWT-validering i kod. Öppnas i ny flik.
- **`payments-webhook`** byggs ut:
  - `customer.subscription.created/updated/deleted` → upsert `subscriptions`.
  - `invoice.payment_succeeded` (subscription, billing_reason `subscription_create` eller `subscription_cycle`) → vid **månadsabonnemang** anropa `add_credits(_kind='plan', _expires_in_days=60, _source_ref='invoice:<id>')`. Vid **årsabonnemang** skippa — cron sköter det.
  - `invoice.payment_failed` → uppdatera status, ingen credit-grant.
- **`refill-yearly-plan-credits`** (cron, dagligen 03:33 UTC) — för varje aktiv yearly subscription där det gått ≥ N månader sedan senaste grant, lägg in nästa månads credits. Idempotent via `subscription_credit_grants`-tabellen (UNIQUE på subscription+period_start).

## 4. UI

- **`Pricing.tsx`**:
  - `mailto:`-CTA för Starter/Growth/Scale → öppnar `<EmbeddedCheckoutDialog>` (modal med `StripeEmbeddedCheckout`).
  - Yearly toggle är redan på plats — pris-IDn väljs utifrån `billing`-state.
  - Ta bort `earlyAccess`-noten i sv.json/en.json.
  - `return_url` = `/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`.
- **`Settings.tsx`** ny sektion "Abonnemang":
  - Aktiv plan (namn, pris, nästa förnyelse, `cancel_at_period_end`-banner om uppsagt).
  - Knapp "Hantera abonnemang" → öppnar portal i ny flik.
  - Visas alltid; tom plan = "Free" + "Uppgradera"-knapp som tar till `/pricing`.
- **`useSubscription`-hook** — TanStack Query med env-filter, realtime-subscription på `subscriptions`-tabellen scoped till user.
- **`PaymentTestModeBanner`** i Layout — visas så länge sandbox-token används, blir tyst efter go-live.

## 5. Klient-utility

- `src/lib/stripe.ts` — `getStripe()`, `getStripeEnvironment()` enligt knowledge-pattern (kasta om token saknas, ingen "default to live").
- `src/components/StripeEmbeddedCheckout.tsx` — wrapper runt `EmbeddedCheckoutProvider`.
- `src/hooks/useStripeCheckout.tsx` — `openCheckout()` / `checkoutElement`.
- Installera `@stripe/stripe-js@9.2.0` och `@stripe/react-stripe-js@6.2.0`.

## 6. Säkerhet & config

- `verify_jwt = false` i `supabase/config.toml` för `create-subscription-checkout`, `create-portal-session`. (`payments-webhook` redan så.)
- `create-portal-session` returnerar 401 om JWT saknas.
- `subscriptions` har bara service_role för INSERT/UPDATE; klienten kan bara läsa sin egen.

## 7. Cron

Daglig cron via `supabase--insert` (samma mönster som expire-credit-buckets) för `refill-yearly-plan-credits` — schemaläggs efter att edge function är deployad.

---

## Det här bygger jag i ordning

1. Stripe-produkter + tax codes
2. DB-migration (subscriptions + plan_credit_grants + subscription_credit_grants)
3. `_shared/stripe.ts`: lägg till `verifyWebhook`
4. Edge function `create-subscription-checkout`
5. Edge function `create-portal-session`
6. Bygg ut `payments-webhook` med subscription-events + invoice-grants
7. Edge function `refill-yearly-plan-credits` + cron
8. Klient-utilities (lib/stripe.ts, useSubscription, StripeEmbeddedCheckout, useStripeCheckout)
9. `npm install` stripe-paketen
10. Uppdatera `Pricing.tsx` med embedded checkout
11. Uppdatera `Settings.tsx` med abonnemangs-sektion
12. `PaymentTestModeBanner` i Layout
13. Ta bort `earlyAccess`-text

Ingen fråga kvar — kör igång när du godkänt.
