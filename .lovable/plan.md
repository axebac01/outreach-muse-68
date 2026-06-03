# Plan

## Problem
Det nya felet är inte längre en cache/auth-race i frontend utan ett rent behörighetsfel i backend.

Jag har verifierat att:
- sidan för **Mejlkonton** läser från `email_accounts_safe` i frontend
- vyn `email_accounts_safe` i databasen fortfarande läser från `email_accounts`
- felet som visas är `permission denied for table email_accounts`
- nuvarande policy på `email_accounts` tillåter ägar-läsning, men det saknas explicita Data API-rättigheter på själva tabellen

Det betyder att vyn finns, men databasen blockerar läsningen innan raden kan returneras.

## Det jag kommer att göra
1. **Laga databasrättigheterna för mejlkonton**
   - lägga till explicita rättigheter på `public.email_accounts` för inloggade användare och backendrollen
   - behålla radskydd så att användare bara kan se sina egna konton

2. **Verifiera den säkra vyn**
   - säkerställa att `email_accounts_safe` bara exponerar ofarliga kolumner
   - kontrollera att appen fortsätter läsa från vyn och inte från bastabellen

3. **Validera kedjan end-to-end**
   - kontrollera att den inloggade användaren faktiskt kan läsa sina rader igen
   - bekräfta att sidan visar kontona i stället för felkortet

## Tekniska detaljer
- Trolig fix är en migration som ger:
  - `authenticated`: läsrätt på `public.email_accounts`
  - `service_role`: full rättighet på `public.email_accounts`
- RLS-regeln `auth.uid() = user_id` ska ligga kvar så att ingen kan läsa någon annans konton.
- Frontendkoden i `useEmailAccounts.ts` ser redan ut att fråga rätt resurs (`email_accounts_safe`), så detta bör inte kräva någon större UI-ändring.

## Förväntat resultat
- dina tidigare anslutna konton blir synliga igen
- felrutan `permission denied for table email_accounts` försvinner
- sidan fortsätter bara exponera säkra fält, inte tokenkolumner

När du godkänner planen gör jag fixen direkt.