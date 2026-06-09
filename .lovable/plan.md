## Mål
Final-steget i onboarding fastnar för evigt på "Vi analyserar ditt företag" efter att man valt betalplan.

## Vad som faktiskt händer
Verifierat mot DB: scrape lyckas (`company_scrape_status = "done"`, `company_name`, `company_target_audience` osv. finns sparade i `profiles`). UI:t fastnar ändå. Orsak:

1. `startScrape` körs när användaren lämnar URL-steget. Resultatet sparas i `useState`-variablerna `companyData` och `scrapeState` i `Onboarding.tsx`. Det sparas också av edge-funktionen i `profiles`-tabellen.
2. När användaren väljer betalplan öppnas Stripe-checkout och redirectar tillbaka till `/onboarding?subscription=success`. Det är en hård sidladdning. All React-state nollställs.
3. localStorage återställer `answers` och `stepIndex` så användaren hamnar tillbaka på plan-steget, sedan triggar `?subscription=success`-effekten `handlePlanChoice` som flyttar till final-steget.
4. På final-steget visas `<AnalysisLoader />` så länge `scrapeState` är `"idle"` eller `"loading"`. Efter en page reload är det `"idle"` — och inget startar om scrapen eller läser den färdiga datan från `profiles`. Loadern snurrar för alltid.

## Plan

### 1. Hydrera scrape-state från profiles vid mount
I `src/pages/Onboarding.tsx`:
- vid mount (när `user` finns), läs `profiles` (`company_url`, `company_scrape_status`, `company_name`, `company_target_audience`, `company_value_prop`, `company_description`).
- om `company_scrape_status === "done"` → sätt `companyData` med fälten och `scrapeState = "done"`. Markera `scrapedFor.current = company_url` så vi inte triggar en ny onödig scrape.
- om `company_scrape_status === "failed"` → sätt `scrapeState = "failed"` med rimlig reason.
- om `pending`/null och vi har `answers.company_url` → låt `startScrape` köra som vanligt när man når URL-steget igen.

### 2. Säkerhetsnät om hydrering inte hjälper
Om vi landar på final-steget med `scrapeState === "idle"` och vi har en URL i `answers`, kicka igång `startScrape` direkt så loadern faktiskt har något att vänta på. Det här skyddar mot edge cases där profiles-raden ännu inte uppdaterats.

### 3. Timeout-skydd för loadern
`SCRAPE_TIMEOUT_MS = 20000` i klienten kan vara för kort när Firecrawl + AI körs sekventiellt i edge-funktionen. Höj till t.ex. 45 sekunder så att loadern inte felaktigt visar fallback medan jobbet fortfarande pågår. Om timeout slår in visas redan fallback-textarean så användaren kan fortsätta manuellt — det är bättre än evig loader, men dagens 20 s är väl snäv mot edge-funktionens faktiska tid.

## Tekniska detaljer
Berörd fil: `src/pages/Onboarding.tsx`

Ingen ändring i `analyze-company` edge-funktion behövs — den fungerar och sparar redan resultatet i `profiles`.

## Verifiering
- Skapa konto → onboarding fram till plan → välj betald plan → Stripe-checkout → redirect tillbaka.
- Final-steget ska visa det analyserade företaget direkt om DB redan har `done`, eller fortsätta loadern och sedan visa data när analysen blir klar.
- Vid faktiskt fel (timeout/no_credits) ska fallback-textarean visas och man ska kunna slutföra onboardingen.