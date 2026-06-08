# Fas 3 — Plan-gates & limits

Hårda gates på allt som kostar pengar eller differentierar planer. Blockerar servern över taket; UI visar tydlig uppgradera-CTA.

## Plan-tak

| Resurs                      | Free  | Starter | Growth | Scale |
| --------------------------- | ----- | ------- | ------ | ----- |
| Mejlkonton                  | 1     | 3       | 10     | ∞     |
| Kampanjer                   | 1     | ∞       | ∞      | ∞     |
| Daglig sänd-cap per konto   | 50    | 200     | 500    | 1 000 |
| AI-svar i inbox (analyze)   | ✗     | ✗       | ✓      | ✓     |

(Existerande `email_account_sending_limits.daily_limit` per konto gäller fortfarande — plan-capen är en *övre gräns* som tas via `LEAST(daily_limit, plan_cap)`.)

## 1. Plan-detektering (källa till sanning)

Ny SQL-funktion `public.get_user_plan(user_uuid)` returnerar `text` (`free|starter|growth|scale`):
- Läser från `subscriptions` (active/trialing/past_due, eller canceled med future period_end) i samma env som anropas via `current_setting('app.env', true)` med fallback till `'live'`.
- Mappar `price_id` → plan-key (samma `PRICE_TO_PLAN`-tabell som i frontend, hårdkodat i funktionen).
- Returnerar `'free'` om ingen aktiv subscription.

Ny SQL-funktion `public.get_plan_limit(user_uuid, resource text)` returnerar `integer` (-1 = obegränsat):
- `email_accounts`, `campaigns`, `daily_sends_per_account` enligt tabellen.

## 2. Hårda gates — server-side

### 2a. Mejlkonton — DB-trigger på `email_accounts` BEFORE INSERT
Trigger `enforce_email_account_limit`:
- Räknar nuvarande `email_accounts` för `NEW.user_id` (alla statusar utom `removed` om det finns).
- Jämför mot `get_plan_limit(NEW.user_id, 'email_accounts')`.
- `RAISE EXCEPTION 'plan_limit_exceeded:email_accounts:%' USING ERRCODE = 'P0001'` om över.

Detta täcker både `oauth-callback` och `connect-smtp-account` automatiskt.

### 2b. Kampanjer — DB-trigger på `campaigns` BEFORE INSERT
Trigger `enforce_campaign_limit`: samma mönster.

### 2c. Daglig sänd-cap — utöka `process-scheduled-sends`
Befintlig kod kollar `email_account_sending_limits.daily_limit`. Lägg till:
- Vid hämtning av "tillgängliga konton", använd `LEAST(daily_limit, get_plan_limit(user_id, 'daily_sends_per_account'))` som effektivt tak.
- Plan-cap för Free (50) är lägre än default 100 → fungerar som hård broms.

### 2d. AI-svar i inbox — gate i `analyze-inbound-email`
- Edge function läser plan via `get_user_plan(user_id)` i början.
- Om plan inte är `growth` eller `scale`: returnera tidigt `{ skipped: true, reason: 'plan_required' }`, sätt `ai_analysis_error = 'plan_required:growth'`. Ingen credit-kostnad.
- `sync-inbox` triggar fortfarande analyze (gate ligger i analyze, inte i sync — då behöver vi inte duplicera plan-check).

## 3. UI — uppgraderings-CTA

### 3a. Reusable `PlanLimitBanner` + `usePlanLimits` hook
- Ny hook `usePlanLimits()` returnerar `{ plan, limits: { email_accounts, campaigns, ... } }`. Använder `get_user_plan` + `get_plan_limit` via en enda RPC.
- Banner: "Du har nått taket för X på Free. Uppgradera till Starter för 290 kr/mån." → länkar till `/pricing`.

### 3b. ConnectEmailDialog
- Innan dialog öppnas: kolla `email_accounts.length >= limit`. Om så, visa banner istället för dialog och knapp till `/pricing`.

### 3c. CreateCampaign (var den nu ligger)
- Samma mönster. Hitta entry-point och lägg till check.

### 3d. Inbox AI-knapp
- Om `plan ∈ {free, starter}`: visa "AI-svar (Growth)" disabled med tooltip "Uppgradera till Growth för automatiska AI-svar" + länk.
- Dölj auto-fill av `suggested_reply` om planen inte når upp.

### 3e. Felhantering på server-fel
- Catch `plan_limit_exceeded:*` i mutations (`useCreateCampaign`, account-connect handlers) → toast med uppgradera-länk.

## 4. Migrationer

**Migration 1 — Plan-funktioner:**
- `get_user_plan(uuid)` — SECURITY DEFINER, läser `subscriptions`.
- `get_plan_limit(uuid, text)` — STABLE, hårdkodad mappning.
- `enforce_email_account_limit()` trigger-funktion + trigger.
- `enforce_campaign_limit()` trigger-funktion + trigger.

Inga nya tabeller, inga nya GRANTs (funktioner är `SECURITY DEFINER`).

## 5. Tester / verifiering manuellt

1. Ny Free-användare → försök connecta 2:a Gmail-konto → ska fela med toast.
2. Skapa kampanj nr 2 som Free → ska fela.
3. Starter-användare → 4:e konto fela.
4. Free-användare i inbox → AI-svar visas inte; analyze-funktionen returnerar `plan_required`.
5. Verifiera att en användare som *nyss* uppgraderat omedelbart kan skapa fler (cache i `usePlanLimits` invalideras på subscription-realtime).

## Filer som ändras

- `supabase/migrations/<ny>.sql` — plan-funktioner + triggers
- `supabase/functions/analyze-inbound-email/index.ts` — plan-gate i toppen
- `supabase/functions/process-scheduled-sends/index.ts` — `LEAST(daily_limit, plan_cap)`
- `src/hooks/usePlanLimits.ts` (ny) — RPC + cache + realtime-invalidation via `useSubscription`
- `src/components/PlanLimitBanner.tsx` (ny)
- `src/components/ConnectEmailDialog.tsx` — gate
- `src/hooks/useCampaigns.ts` — fånga `plan_limit_exceeded`-fel + visa CTA
- `src/pages/Inbox.tsx` — gate AI-knapp + auto-fill

Inga paket. Ingen ny edge function.

## Vad jag INTE gör

- Bygger inte om kreditsystemet — leads kostar fortfarande credits oavsett plan.
- Gatar inte `inbound` (företagsspårning) — den är "Kommer snart" och har ingen riktig funktion än.
- Migrerar inte befintliga användare ut ur över-tak-läge. Om någon har 5 konton och hamnar på Free → de behåller dem, men kan inte skapa fler. Det är acceptabelt för launch.
- Lägger inte till "downgrade kräver att du först stänger X konton" — kommer i en senare polish-fas.
