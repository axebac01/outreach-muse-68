## Mål
Onboardingen får aldrig krascha pga. att `analyze-company` misslyckas. Användaren ska kunna slutföra registreringen och fylla i företagsbeskrivning manuellt om scrape failar.

## Ändringar

### 1. `supabase/functions/analyze-company/index.ts`
- Returnera alltid HTTP **200** med JSON, även vid fel. Lägg till `{ ok: false, fallback: true, reason: "scrape_failed" | "ai_failed" | "no_credits" | "unauthorized" }`.
- Detektera Firecrawl 402 specifikt → `reason: "no_credits"` så frontend kan visa rätt meddelande.
- Sätt `company_scrape_status: "failed"` i `profiles` så vi kan reagera på det.

### 2. `src/pages/Onboarding.tsx`
- I anropet till `analyze-company`: behandla `{ ok: false, fallback: true }` som ett mjukt fel (inte exception). Logga via `console.warn` istället för `throw`.
- Befintlig 20s-timeout + manuellt textfält-fallback aktiveras automatiskt vid `fallback: true` — koppla in den även när responsen kommer snabbt men misslyckats.
- På final-screen: om scrape failade, visa "Vi kunde inte hämta din företagsinfo automatiskt — beskriv kort vad ni gör" istället för wow-momentet (textarea sparas till `company_description`).
- Säkerställ att `onboarding_completed = true` sätts oavsett om scrape lyckats — användaren ska aldrig fastna här.

### 3. `OnboardingGate` / Signup-flow
Ingen ändring — fungerar redan.

## Tekniska detaljer
- 402-detektion: `if (fcResp.status === 402) reason = "no_credits"` innan generic scrape_failed.
- Edge function status alltid 200 så att supabase-js inte kastar `FunctionsHttpError` på frontend.
- Behåll auth-check (401 returneras fortfarande som status 200 + `reason: "unauthorized"` för konsekvens, eller lämnas som 401 — välj 200 för enklare frontend).

## Vad användaren behöver göra parallellt
Toppa upp Firecrawl-krediter med kupong **LOVABLE50** (annars körs fallback-flödet permanent och ingen får företagsanalys).
