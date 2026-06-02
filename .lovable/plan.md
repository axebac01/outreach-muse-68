## Plan: SEK-priser på svenska versionen

Growth-planens pris ska visas i svenska kronor (SEK) när användaren har svenska som språk, och fortsätta visas i euro (EUR) för engelska.

### Ändringar

1. **Översättningsfiler**
   - `src/i18n/locales/sv.json` — uppdatera nycklarna under `pricing`:
     - `growthPrice`: `"€99"` → `"990"`
     - `growthPeriod`: `"/månad"` → `" kr/månad"`
   - `src/i18n/locales/en.json` — oförändrad (behåller `€99` och `/month`).

2. **Landing page (AuroraLanding)**
   - `src/components/AuroraLanding.tsx` — just nu hårdkodat `"€99"` och `"/månad"` i prisdelen.
   - Byt ut mot dynamisk rendering via `useTranslation()` från `react-i18next`:
     - Hämta aktuellt språk (`i18n.language`) och rendera antingen `"990 kr/månad"` (svenska) eller `"€99/månad"` (engelska/övrigt).

### Tekniska detaljer
- AuroraLanding använder idag inte `react-i18next`. Vi lägger till `useTranslation`-import och hämtar språket.
- Svenska varianten: prisnummer + " kr/månad" (motsvarar 990 kr/mån).
- Engelska varianten: oförändrat "€99/månad".
- Ingen påverkan på databas, backend eller betalningsflöden — endast visningsvärden.