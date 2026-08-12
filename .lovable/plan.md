# Fixa uppgradering: direkt uppdatering, bekräftelse och rätt plangränser

Tre problem efter uppgradering till Growth. Alla tre är bekräftade i koden/databasen.

## 1. Kampanjgränsen är fel (viktigast)

Databasen säger redan rätt sak: `get_plan_limit(..., 'campaigns')` ger 1 för Free och obegränsat (-1) för alla betalplaner. Sidan "Skapa kampanj" använder den funktionen och är korrekt.

Men Dashboard och Inställningar använder en gammal hook (`useUsage`) som läser `profiles.plan` — ett fält som betalnings-webhooken aldrig uppdaterar. Det står därför kvar på "starter" med hårdkodad gräns på 1 kampanj, vilket gör att knappen "Ny kampanj" är utgråad och en uppgraderingsbanner visas trots att du har Growth.

Åtgärd: låt Dashboard och Inställningar läsa plan och gränser från samma källa som resten av appen (`usePlanLimits`, dvs. databasfunktionerna) i stället för `profiles.plan`. Gränserna visas då som "obegränsat" för betalplaner, och knappen blir aktiv direkt.

## 2. Statusen uppdaterades inte direkt efter betalning

Efter checkout landar du på `/settings?subscription=success`. Sidan hämtar prenumerationen en gång vid laddning — men Stripes webhook som skriver in raden kan komma ett par sekunder senare, så du ser fortfarande "Free" tills du refreshar.

Åtgärd: när `?subscription=success` finns i adressen, hämta prenumerationen om med korta intervall (ca varannan sekund i upp till ~30 sekunder) tills en aktiv rad dyker upp, och uppdatera samtidigt plangränser och kreditsaldo. Ingen manuell refresh behövs.

## 3. Ingen bekräftelse på att uppgraderingen gick igenom

Åtgärd: när prenumerationen bekräftats visas en "Grattis"-vy på Inställningar — ett kort med plannamn, antal credits per månad och vad som låsts upp (obegränsade kampanjer, fler e-postkonton, högre dagsvolym, AI i inkorgen för Growth/Scale). Medan vi väntar på Stripe visas ett "Bekräftar din betalning…"-läge, och en tydlig fallback om det tar ovanligt lång tid. Query-parametern rensas ur adressfältet efteråt så att kortet inte kommer tillbaka vid reload.

## Teknisk sammanfattning

- `src/hooks/useUsage.ts`: hämta plan/gränser via `usePlanLimits` (`get_user_plan` / `get_plan_limit`) i stället för `profiles.plan`; behandla `-1` som obegränsat i `canCreateCampaign` och i procentberäkningar.
- `src/pages/Dashboard.tsx` och `src/pages/Settings.tsx`: inga logikändringar utöver att de nu får korrekta värden; Settings visar "∞" för obegränsade resurser.
- `src/pages/Settings.tsx`: läs `?subscription=success`, polla `useSubscription().refetch()` + invalidera `plan_limits` och kreditsaldo tills aktiv rad finns, rensa param med `navigate(..., { replace: true })`.
- Ny komponent `src/components/UpgradeSuccessCard.tsx` för väntande/klar/timeout-läge.
- Ingen ändring i databas, webhook eller Stripe-konfiguration.
