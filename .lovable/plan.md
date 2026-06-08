# Fas 3.5 — Polish & verifiering inför test

Tre konkreta fixar + en verifierings-runda. Inget nytt feature, bara stänga luckorna så testflödet inte kraschar.

## A1. Migrera `useUsage` → `usePlanLimits` på CreateCampaign

**Problem:** `CreateCampaign.tsx` använder `useUsage().canCreateCampaign`. Den hooken läser `profile.plan` (legacy-fält) och har bara `starter`/`growth` i sin `LIMITS`-tabell — Free och Scale finns inte. En Free-user får default `starter` med 1 kampanj, vilket *råkar* funka, men det är en bugg som väntar på att hända.

**Fix:**
- `CreateCampaign.tsx`: byt ut `useUsage` mot `usePlanLimits` + en separat count-query för kampanjer (eller låt `usePlanLimits` returnera `currentCounts` också — enklare). Använd `canCreateMore(limits, "campaigns", count)`.
- Behåll `UpgradeBanner` med samma i18n-text. Banner visas när `!canCreate`.
- **Rör inte** `useUsage` i resten av kodbasen i denna runda — bara CreateCampaign. (Resten kan migreras i en senare polish-fas.)

## A2. Banner på `EmailAccounts.tsx`

**Problem:** Listsidan visar ingen feedback när användaren nått taket. Knappen "Anslut konto" är fortfarande klickbar; dialogen visar bannern först när den öppnas.

**Fix:**
- Lägg in `PlanLimitBanner` ovanför kontolistan om `accounts.length >= limits.email_accounts` (och limit ≠ -1).
- Disable "Anslut konto"-knappen i samma villkor, med tooltip "Du har nått taket för din plan".
- Banner-texten: "Du har använt X av Y mejlkonton på {plan}-planen. Uppgradera för att lägga till fler."

## A3. Verifiering — triggers + felöversättning

**Hur:** Direkt SQL-test mot DB som inloggad preview-user.

1. Kör `SELECT public.get_user_plan(auth.uid())` — bekräfta att den returnerar `free` för testanvändaren.
2. Kör `SELECT public.get_plan_limit(auth.uid(), 'email_accounts')` — ska returnera `1`.
3. Skapa en andra `email_accounts`-rad via INSERT — bekräfta att `plan_limit_exceeded:email_accounts:1` kastas.
4. I UI: trigga felet via "Anslut konto"-flödet. Bekräfta att toast visar svensk text från `errorMessages.ts`, inte raw `P0001`-meddelandet.
5. Samma för `campaigns`.

Om något steg misslyckas: fix on the spot i samma fas.

## B4. Onboarding → första kampanj — smoke test

**Hur:** Manuell genomgång (ingen kod):
- Ny user (eller rensa befintlig profile) → `/signup` → onboarding → connect gmail → skapa kampanj → skicka test.

Jag listar checkpoints användaren kan följa, och fixar bara om något konkret går sönder.

## Filer som ändras

- `src/pages/CreateCampaign.tsx` — byt `useUsage` → `usePlanLimits`
- `src/pages/EmailAccounts.tsx` — lägg till banner + disable-knapp
- `src/hooks/usePlanLimits.ts` — utöka med `currentCounts` (email_accounts, campaigns) via en extra query, så vi slipper räkna i två komponenter
- `src/i18n/locales/sv.json` + `en.json` — eventuella nya banner-strängar

## Vad jag INTE gör nu

- Migrerar inte hela `useUsage` ut (används också i Leads/Dashboard — separat polish-fas).
- Ändrar inte plan-limits-tabellen.
- Lägger inte till nya tester/CI.
- Rör inte Stripe go-live (separat fråga).

## Acceptanskriterier

- Free-user på `/create-campaign` med 1 befintlig kampanj ser banner och har submit-knappen disabled.
- Free-user på `/email-accounts` med 1 konto ser banner och har "Anslut"-knappen disabled.
- Manuellt SQL-test bekräftar trigger fungerar.
- Inget regressionsfel på Starter/Growth/Scale-användare (de ska kunna skapa fritt).
