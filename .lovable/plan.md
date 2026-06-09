## Mål
Eliminera kraschen efter onboarding: `cannot add postgres_changes callbacks ... after subscribe()`.

## Vad som faktiskt är fel
Det här verkar nu vara en annan, mer exakt orsak än första hypotesen:

- `src/pages/Onboarding.tsx` använder `useSubscription()` för `refetchSubscription`.
- `src/components/OnboardingPlanStep.tsx` använder också `useSubscription()`.
- När plan-steget visas mountas båda samtidigt och försöker registrera samma realtime-topic: `subscriptions:${userId}:${env}`.
- Klienten återanvänder kanal per topic, så andra `.on("postgres_changes", ...)` efter `.subscribe()` kastar exakt felet användaren ser.

Det förklarar varför felet fortfarande finns trots senaste fixen i hookens dependencies.

## Plan

### 1. Ta bort dubbla mounts i onboardingflödet
Ändra onboarding så bara **en** komponent använder `useSubscription()` under plansteget.

Föreslagen lösning:
- `src/pages/Onboarding.tsx`
  - ta bort `useSubscription()` härifrån
  - ersätt polling efter `?subscription=success` med en direkt läsning/refetch via query cache eller direkt DB-fråga för att avgöra vald plan
- `src/components/OnboardingPlanStep.tsx`
  - behåll `useSubscription()` här, eftersom komponenten redan behöver aktiv status + checkout-close-logik

Det gör att onboarding inte längre dubblar samma topic.

### 2. Hårdna `useSubscription()` mot framtida dubletter
I `src/hooks/useSubscription.ts` lägger jag in ett defensivt skydd så hooken inte kraschar hela appen även om samma topic skulle mountas två gånger igen.

Exempel på skydd:
- kontrollera om en kanal med samma topic redan finns och återanvänd/ta bort den innan ny subscription skapas, eller
- flytta realtime-lyssningen till en delad singleton per topic i modulen.

Jag väljer den minst invasiva varianten som passar nuvarande kodbas.

### 3. Validera att kraschen verkligen är borta
Verifiering efter implementation:
- skapa konto
- gå igenom onboarding
- öppna plansteget
- genomför checkout/återgång till onboarding
- landa i dashboard utan vit sida
- kontrollera att console inte längre visar `cannot add postgres_changes callbacks`
- kontrollera att subscription-status fortfarande uppdateras korrekt i UI

## Tekniska detaljer
Berörda filer:
- `src/pages/Onboarding.tsx`
- `src/components/OnboardingPlanStep.tsx`
- `src/hooks/useSubscription.ts`

Ingen backend-migration behövs. Det här är en frontend/realtime-fix.