# Skjuta upp launch till 31 augusti

## Mål
Uppdatera allt lanseringsdatum-relaterat innehåll från 15 augusti till 31 augusti 2026.

## Ändringar

1. **Konfiguration**
   - `src/config/launch.ts`: ändra `LAUNCH_DATE` till `2026-08-31T09:00:00+02:00`.

2. **Kopior som uppdateras från "15 augusti" till "31 augusti"**
   - `src/pages/Waitlist.tsx`: formulärsbekräftelse, `<title>`, meta description, hero-rubrik och bekräftelsemeddelande.
   - `src/components/AuroraLanding.tsx`: badge-texten "Soft launch · vi öppnar 15 augusti".
   - `src/components/SeoArticleLayout.tsx`: CTA-text längst ner.
   - `src/pages/blog/BlogPost.tsx`: CTA-text längst ner.

3. **Kvarstående text**
   - Generiska formuleringar som "i augusti" eller "inför launch" behålls oförändrade eftersom de fortfarande stämmer.

## Verifiering
- Öppna `/waitlist` och bekräfta att nedräkningen pekar på 31 augusti 09:00.
- Kontrollera att hero-rubriken och meta-taggarna visar 31 augusti.
- Bekräfta att startsidans badge visar "Soft launch · vi öppnar 31 augusti".
