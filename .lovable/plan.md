# Avregistrera: vad de 14 visningarna faktiskt är

## Vad jag såg i data

- `unsubscribes` innehåller **1 rad totalt** — `ingen-finns-har@bisdata-kampanj-finns-inte-xyz.se`, källa `test`, 17 aug. Det är din egen testavregistrering. Inga riktiga mottagare har avregistrerat sig.
- Projektanalysen 12–19 aug: 14 sidvisningar på `/avregistrera`, och **samtliga 14 besökare kommer från US**, medan alla svenska besök ligger på `/`, `/pricing`, `/login`, `/dashboard`. Dina mottagare är svenska företag.
- Din egen `visits`-tabell (site-trackern) har 0 rader, så siffran kommer enbart från plattformens analys.

Slutsatsen: träffarna är med mycket hög sannolikhet **länkskannrar** (Microsoft Defender/Google/spamfilter i amerikanska datacenter) som öppnar varje länk i mejlet automatiskt — inte människor som misslyckats. En människa som klickade och fick fel skulle inte lämna någon spårbar rad idag, så vi kan inte bevisa motsatsen — därför föreslår jag loggning nedan.

En viktig sidoeffekt: sidan avregistrerar **automatiskt vid laddning**. Kör en skanner JavaScript avregistreras mottagaren utan att ha bett om det. Att bara 1 rad finns tyder på att skannrarna inte kört JS — men risken är reell.

## Vad som byggs

### 1. Bekräftelseknapp istället för auto-avregistrering
`/avregistrera` visar mottagarens adress och en knapp "Ja, avregistrera mig". Ingen avregistrering sker förrän knappen trycks. Efter klick visas dagens bekräftelsevy. Ogiltig/saknad länk visar felvyn direkt som nu.
Ett-klicks-avregistrering via mejlklientens inbyggda knapp (`List-Unsubscribe-Post`) påverkas inte — den går fortfarande direkt igenom på servern.

### 2. Logga varje försök så vi ser sanningen framöver
Varje anrop till avregistreringsfunktionen loggas: lyckad, ogiltig token, eller bara sidvisning utan klick. Då syns det i data om någon faktiskt misslyckas nästa gång.

### 3. Visa det i produkten
Kampanjens Översikt kompletteras med "Avregistreringsförsök som misslyckades" om sådana finns, så du får en tidig signal om trasiga länkar istället för att gissa.

## Teknisk detalj

- Ny tabell `unsubscribe_events` (user_id, email nullable, token_kind, outcome: `viewed` | `confirmed` | `invalid_token`, ip-hash, created_at) med GRANT till `authenticated` (SELECT, egen user_id) och `service_role`, RLS på, inga insert-policys för klienter — funktionen skriver via service role.
- `supabase/functions/unsubscribe/index.ts`: nytt läge `action=peek` (validerar token, returnerar maskerad adress, loggar `viewed`) respektive `action=confirm` (nuvarande beteende, loggar `confirmed`). POST utan `format=json` (List-Unsubscribe one-click) fortsätter avregistrera direkt. Ogiltig token loggar `invalid_token`.
- `src/pages/Unsubscribe.tsx`: hämtar `peek` vid mount, visar adress + bekräftelseknapp, anropar `confirm` vid klick.
- `src/hooks/useSequence.ts` + `src/components/campaign/OverviewTab.tsx`: räknar `invalid_token`-händelser per användare och visar dem endast när antalet > 0.
- Inga ändringar i själva sändningsflödet eller i länkformatet i mejlen.
