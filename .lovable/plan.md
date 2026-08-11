# Bugg: onboarding körs två gånger

## Vad som händer
Kontot `axel.backstrom@crmdata.se` har nu `onboarding_completed = true` i databasen, så sparandet fungerar — problemet ligger i klienten, direkt efter att man trycker "kör igång".

I `finish()` (`src/pages/Onboarding.tsx`) sker detta i tur och ordning:
1. Profilen uppdateras i databasen med `onboarding_completed: true`.
2. `localStorage`-nyckeln med onboarding-progressen raderas.
3. `queryClient.invalidateQueries({ queryKey: ["profile"] })` anropas — men resultatet inväntas inte.
4. `navigate("/dashboard")` körs direkt.

`OnboardingGate` läser profilen via React Query. I det ögonblick navigeringen sker finns fortfarande den **cachade** profilen med `onboarding_completed: false` (invalidate startar bara en refetch i bakgrunden; `isLoading` är `false` för cachad data). Grinden ser alltså ett ofärdigt konto och skickar tillbaka till `/onboarding`. Eftersom localStorage redan rensats börjar flödet om från steg 1 — därav "jag fick göra onboardingen två gånger". Andra gången hade refetchen hunnit i mål, så då släpptes man in.

## Fix

1. **`src/pages/Onboarding.tsx` — `finish()`**
   - Skriv det nya profilvärdet direkt i React Query-cachen (`setQueryData(["profile", user.id], ...)`) så grinden ser rätt status omedelbart.
   - Invänta `refetchQueries` för `["profile"]` innan `navigate("/dashboard")`.
   - Rensa localStorage först efter att navigeringen initierats.

2. **`src/components/OnboardingGate.tsx` — hårdare grind**
   - Visa inget (returnera `null`) även när profilen håller på att hämtas om (`isFetching` utan data eller vid pågående refetch efter invalidering), i stället för att omedelbart redirecta på gammal cache.
   - Redirecta bara när det finns färsk profildata som faktiskt säger `onboarding_completed === false`.

3. **Skydda mot omstart av redan avklarad onboarding**
   - I `Onboarding.tsx`: om profilhydreringen ser `onboarding_completed === true`, navigera direkt till `/dashboard` i stället för att rendera steg 1. Det gör att även en eventuell felaktig redirect blir osynlig för användaren.

## Teknisk detalj
Endast frontend-ändringar i `src/pages/Onboarding.tsx` och `src/components/OnboardingGate.tsx`. Ingen databas- eller schemaändring behövs; `onboarding_completed` sparas redan korrekt.
