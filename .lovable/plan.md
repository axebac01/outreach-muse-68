## Vad jag hittade
- Backend ser frisk ut, så felet kommer inte från driftmiljön.
- Dina mejlkonton finns sparade, men deras tokens ligger i fel format i databasen.
- I stället för rå krypterad data är de sparade som JSON-liknande byteobjekt (`{"0":..., "1":...}`), vilket gör att dekrypteringen alltid kraschar i utskicksfunktionen.
- Därför får båda kontona samma `decrypt_secret failed: Wrong key or corrupt data` även om själva kontona är korrekt anslutna.

## Plan
1. **Gör dekrypteringen bakåtkompatibel**
   - Uppdatera den delade token-hanteringen så den klarar både korrekt lagrad krypterad data och det äldre felaktiga JSON-byteformatet.
   - Samma fix ska täcka både OAuth-konton och SMTP-lösenord.

2. **Självläka sparade konton**
   - När ett konto läses och det äldre formatet upptäcks, konvertera det tillbaka till rätt binärt format och spara om kontot korrekt.
   - Då slipper användaren normalt återansluta kontot bara för att komma runt denna bugg.

3. **Förbättra felhanteringen om något konto verkligen inte går att rädda**
   - Om ett konto fortfarande inte går att dekryptera efter normalisering ska systemet markera det tydligt som att det behöver återanslutas, i stället för att bara kasta ett generiskt 502-fel.
   - Visa ett begripligt felmeddelande i gränssnittet så det blir tydligt vad som krävs.

4. **Verifiera hela flödet**
   - Deploya uppdaterade backendfunktioner.
   - Testa utskick med de befintliga kontona och säkerställ att testmejl går igenom utan 502-felet.
   - Bekräfta även att synk-status och kontostatus inte längre fastnar på samma dekrypteringsfel.

## Tekniska detaljer
- Trolig huvudfix ligger i de delade OAuth-/krypteringshjälparna och i mejlutskicksflödet.
- Ingen ny datamodell verkar behövas; det här ser ut som ett serialiseringsproblem i hur krypterade bytes skrevs/lästes.
- Om vissa poster visar sig vara genuint korrupta efter normalisering kommer de kontona behöva återanslutas, men planen är att först försöka rädda befintlig data automatiskt.