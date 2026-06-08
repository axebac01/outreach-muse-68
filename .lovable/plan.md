# Verifiering av senaste bygget

Jag har gått igenom allt som byggdes (OnboardingPlanStep, Onboarding-integration, useSubscription, checkout-flöde, edge functions). Funktionellt fungerar det, men jag hittade **3 buggar** och **3 mindre förbättringar** som bör fixas innan launch.

## Buggar att fixa

### 1. Hårdkodad plan vid retur från Stripe
I `Onboarding.tsx` (rad 293) anropas `handlePlanChoice("growth")` när `?subscription=success` upptäcks — oavsett vilken plan användaren faktiskt köpte. Det skriver fel värde till `profiles.onboarding_plan_choice` (vi förlitar oss på det för segmentering).

**Fix:** Vänta in `useSubscription` så vi har riktig `price_id`, mappa till plan-key (`starter`/`growth`/`scale`), och anropa med korrekt värde.

### 2. "Du har redan ett abonnemang" sparar fel val
I `OnboardingPlanStep.tsx` (rad 84): "Fortsätt"-knappen anropar `onSelect("free")` även när användaren har en aktiv betald plan. Skriver `'free'` till `onboarding_plan_choice` trots aktivt abonnemang.

**Fix:** Mappa från `subscription.price_id` → `PlanChoice` och skicka rätt värde.

### 3. localStorage-restore kan hoppa över plan-steget
`STORAGE_KEY = "onboarding_progress_v1"` sparar `stepIndex`. Om en gammal session från före plan-steget infördes ligger i localStorage, kan användaren landa på fel index (eller hoppa över plan-steget om hen tidigare nådde "final"). Inte kritiskt för nya användare men ett edge case vid återkommande sessioner i preview/produktion.

**Fix:** Bumpa nyckeln till `onboarding_progress_v2`.

## Förbättringar

### 4. Dialog-stängning re-fetchar inte subscription
`handleDialogChange` i OnboardingPlanStep läser `isActive` från `useSubscription` när dialogen stängs. Men webhooken kan ta 1–3 sekunder, och realtime-eventet på `subscriptions` triggar bara om raden redan finns. Vid första subscription finns ingen rad → ingen INSERT-event hörs eftersom filter `user_id=eq.X` matchar både insert/update.

Faktiskt: Supabase realtime postgres_changes med `event: "*"` triggar på INSERT. Så det borde funka. **Lämnar oförändrat** — men lägger till en manuell `refetch()` vid dialog-stängning som säkerhetsnät.

### 5. Skip-länken loggar inte att den är "skip"
"Hoppa över" och Free-knappen sparar båda `'free'`. Då kan vi inte skilja på "valde aktivt Free" vs "hoppade över helt". Lägg till en separat `'skip'`-variant så analytics kan särskilja.

**Beslut:** Skippa — overkill för launch. Båda är "inte betalande", spelar ingen roll just nu.

### 6. Steg-räknaren visar plan-steget i räkningen
`STEG ${stepIndex + 1} AV ${steps.length - 1}` visar "STEG 8 AV 8" på plan-steget. OK numeriskt, men plan är inte en "fråga". Kan kännas konstigt att frågan-räknaren stannar på 8/8.

**Fix:** Visa ingen "STEG X AV Y" på plan-steget — bara på text/url/choice. (Plan-steget har egen header "Välj plan".)

## Vad jag INTE rör

- Edge functions (`create-subscription-checkout`, `payments-webhook`) — verifierade, ser korrekta ut.
- `SubscriptionSection` i Settings — fungerar.
- `useSubscription` env-filtrering — korrekt enligt knowledge.
- `managed_payments` på checkout — korrekt aktiverat.

## Filer som ändras

- `src/pages/Onboarding.tsx` — fix #1, #3, #6 (mappning från price_id, bumpa STORAGE_KEY, dölj steg-räknare på plan-steg)
- `src/components/OnboardingPlanStep.tsx` — fix #2, #4 (mappa subscription till PlanChoice för "Fortsätt"-knapp, refetch vid dialog-close)

Inga DB-migrationer, inga nya edge functions, inga paket.

## Teknisk detalj: price_id → PlanChoice-mappning

```ts
const PRICE_TO_PLAN: Record<string, PlanChoice> = {
  starter_monthly: "starter", starter_yearly: "starter",
  growth_monthly:  "growth",  growth_yearly:  "growth",
  scale_monthly:   "scale",   scale_yearly:   "scale",
};
```

Delas mellan `Onboarding.tsx` och `OnboardingPlanStep.tsx` (exporteras från komponenten).
