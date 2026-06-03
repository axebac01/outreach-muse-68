# Plan

## Mål
Fixa två buggar:
1. Anslutna mejlkonton ska visas korrekt efter refresh / utloggning / inloggning.
2. Footern ska inte visas inne i den inloggade appen, bara på publika sidor.

## Det jag kommer bygga

### 1) Stabil auth-gate för data som kräver inloggning
Jag säkrar att sidor som läser användarspecifik data inte frågar databasen innan sessionen verkligen är återställd. Det ska stoppa läget där kontolistan råkar hämta med `auth.uid() = null` och därför ser tom ut trots att konton finns.

### 2) Tydlig felhantering på mejlkontosidan
Just nu visas tom-state även om frågan kan ha misslyckats. Jag lägger till ett riktigt felläge på `/email-accounts` så att en auth-/RLS-/view-fråga inte maskeras som “inga konton”.

### 3) Gör mejlkonto-queryn användarsäker
Jag uppdaterar hooken för mejlkonton så att den är kopplad till aktuell användare och refetchas korrekt när session/användare ändras.

### 4) Separera public layout från app-layout
Jag delar upp nuvarande `Layout`, eftersom den idag alltid renderar `Footer` och `CookieBanner`. Appsidorna får en egen layout utan footer, medan login/landing/legal kan fortsätta använda public layout.

### 5) Verifiering
Jag verifierar i preview att:
- `/email-accounts` visar konton efter hård refresh
- tom-lista bara visas när det faktiskt inte finns några konton
- eventuella fetchfel visas som fel, inte som empty state
- footern inte syns på `/email-accounts` eller andra inloggade vyer
- footern fortfarande syns på publika sidor

## Tekniska detaljer
- `src/context/AuthContext.tsx`: göra auth readiness tydligare och undvika att appen släpper igenom skyddade queries för tidigt.
- `src/hooks/useEmailAccounts.ts`: användarspecifik `queryKey`, bättre `enabled`-villkor och korrekt re-fetch vid session byte.
- `src/pages/EmailAccounts.tsx`: separat hantering för `isLoading`, `error`, `empty`.
- `src/components/Layout.tsx` och berörda sidor: dela upp i t.ex. `PublicLayout` och `AppLayout` eller motsvarande enkel variant.

## Förväntat resultat
Efter detta ska du inte längre få “inga konton” när konton faktiskt finns, och mejlkontosidan ska kännas som en riktig appvy utan publikt footer-block.