
# Plan-val i onboarding

Lägger ett nytt steg sist (precis före slutskärmen) där användaren väljer plan. Free är förvalt så ingen tvingas betala för att komma in i appen.

## Nytt steg

Komponent: ny `OnboardingPlanStep` som renderas inline i `Onboarding.tsx` (egen step-type `"plan"`).

Visar 4 enkla kort i en rad:

| Free | Starter | Growth (populär) | Scale |
|---|---|---|---|
| 25 credits (engång) | 250/mån · 290 kr | 1 000/mån · 990 kr | 3 000/mån · 2 490 kr |
| "Fortsätt gratis" | "Välj Starter" | "Välj Growth" | "Välj Scale" |

- Toggle månad/år ovanför korten (defaultar till "monthly").
- "Hoppa över" länk under korten (= samma som Free).

## Flöde

1. **Free / Hoppa över** → sätter `onboarding_plan_choice = 'free'` på profilen och går till `final`-steget direkt.
2. **Paid plan** → öppnar samma `SubscriptionCheckoutDialog` som på `/pricing`. `return_url` pekar på `/onboarding?subscription=success` så de hamnar tillbaka i wizarden.
3. När webhooken skapar subscriptionen får `useSubscription`-hooken realtime-event. Vid `subscription=success` i URL:en visas en bekräftelse-toast och steget markeras som klart → autoadvance till `final`.
4. Om användaren stänger checkout-dialogen utan att slutföra → ingen ändring, de kan välja igen eller hoppa över.

## Profil-fält

Lägger till en ny kolumn `onboarding_plan_choice text` på `profiles` (`'free' | 'starter' | 'growth' | 'scale'`, nullable). Används för analytics/segmentering — vi förlitar oss inte på den för åtkomst (subscriptions-tabellen är sanningen).

## Edge cases

- **Redan aktivt abonnemang** (kom till onboarding via remix etc): steget visar "Du har redan Growth — fortsätt" och hoppar förbi val.
- **Stripe inte konfigurerat än** (`isPaymentsConfigured()` falskt): kortets paid-knappar visar tooltip "Tillgängligt snart" och är disabled. Free funkar alltid. Detta gör att steget aldrig är trasigt även innan go-live.
- **localStorage-restore**: stegets index bumpas med 1 — vi kollar `Math.min(parsed.stepIndex, steps.length - 1)` redan, så återupptagning landar på rätt ställe.

## Filer

- `src/pages/Onboarding.tsx` — ny `"plan"`-step-type, render-block, hantering av URL-param `?subscription=success`.
- `src/components/OnboardingPlanStep.tsx` — själva korten + toggle + checkout-trigger.
- `supabase/migrations/...` — `ALTER TABLE profiles ADD COLUMN onboarding_plan_choice text`.
- Inga andra ändringar på `SubscriptionCheckoutDialog` eller webhook — återanvänder Fas 2-infrastrukturen.

## Inte med i den här fasen

- Trial-period på paid plans (kräver Stripe-konfig).
- Annual-rabatt-prompt om de väljer monthly (kan läggas till senare i Settings).

---

**En kvarstående fråga innan jag bygger:** Ska "Skip / Fortsätt gratis" vara en lika prominent knapp som de betalda, eller en mindre länk längst ner (mer push mot paid)?
