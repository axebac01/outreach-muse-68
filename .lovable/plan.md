## Mål
Onboardingen får aldrig fastna i analysläget. Om automatisk företagsanalys inte går att köra — till exempel vid slut på credits, nätverksfel eller timeout — ska användaren direkt eller efter kort väntan få ett manuellt fallback-fält där de själva beskriver företaget.

## Vad jag har verifierat
- `FinalStep` visar fortfarande loadern så länge `scrapeState` är `"loading"` eller `"idle"`.
- `startScrape()` i `src/pages/Onboarding.tsx` använder `Promise.race`, men fångar inte ett avvisat `supabase.functions.invoke(...)`-anrop.
- Om funktionsanropet kastar i stället för att returnera `{ data, error }`, lämnas state kvar i `loading`, vilket förklarar att det kan se ut som att den håller på för alltid.
- Den manuella fallbacken finns redan i `FinalStep`, men den triggas bara när `scrapeState` faktiskt sätts till `failed`.

## Plan

### 1. Gör analysanropet feltåligt i `src/pages/Onboarding.tsx`
Uppdatera `startScrape()` så att alla felvägar alltid leder till fallback i UI:t:
- Wrappa funktionsanropet i `try/catch` eller lägg på `.catch(...)` så att även avvisade promises sätter `scrapeState` till `"failed"`.
- Tolka både hårda fel (`error`, exception, timeout) och mjuka fel (`data.ok === false`, `fallback === true`, `reason === "no_credits"`) som fallback.
- Spara gärna en separat `scrapeFailureReason` i state så att UI:t kan veta varför analysen uteblev.

### 2. Visa manuell fallback direkt när analysen inte kan köras
Justera final-steget så att användaren inte lämnas i loadern längre än nödvändigt:
- Om svaret säger att analysen inte gick att köra, växla direkt till textarea-vyn.
- Behåll timeout som extra skydd, men låt den bara vara en sista fallback — inte huvudvägen.
- Säkerställ att `idle` inte kan ligga kvar när användaren väl är på final-steget efter att analysen försökt starta.

### 3. Förbättra copy i fallback-läget
Gör fallbacken tydligare och tryggare för användaren:
- Byt till text i stil med: “Vi kunde inte läsa in din hemsida automatiskt just nu. Skriv kort vad företaget gör så fortsätter vi.”
- Om `reason === "no_credits"`, visa ett lite mer precist men fortfarande enkelt meddelande om att automatisk analys är tillfälligt otillgänglig.
- Behåll fokus på att onboarding kan slutföras direkt utan att något blockerar.

### 4. Säkerställ att onboarding alltid kan slutföras
Bekräfta i `finish()`-flödet att:
- `onboarding_completed = true` sätts även när analysen uteblir.
- `company_description` sparas från textarea när fallback används.
- Ingen extra analys krävs för att komma vidare till dashboarden.

### 5. Verifiering efter ändring
När planen godkänts kommer jag att verifiera att följande scenarier fungerar:
- Analys lyckas: wow-state + sparad företagsdata.
- Analys returnerar `{ ok: false, fallback: true }`: textarea visas direkt.
- Funktionsanrop kastar/rejectar: textarea visas i stället för evig loader.
- Timeout: textarea visas efter timeout.
- Slutför onboarding i fallback-läge: användaren skickas vidare och fastnar inte i `/onboarding`.

## Tekniska detaljer
- Mest sannolik rotorsak just nu är att `supabase.functions.invoke("analyze-company")` kan rejecta utan att koden fångar det.
- Den befintliga fallback-UI:n i `FinalStep` kan återanvändas; det som behöver säkras är state-hanteringen före renderingen.
- Ingen ny databasmigration behövs för detta arbete — det är främst frontendlogik och eventuellt liten finjustering av funktionsrespons om det behövs.