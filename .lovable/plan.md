# Smart mappning av CSV-kolumner

Idag gissas fält bara vid exakt matchning av rubriknamn (t.ex. "email", "företag"). Rubriker som "Work Email", "Contact_Name" eller "Företagets hemsida" hamnar på "ignorera". Vi gör gissningen smartare och tydligt ändringsbar.

## Vad som byggs

1. **Fuzzy rubrikmatchning**
   - Normalisera rubriker (gemener, ta bort `_`, `-`, punkter, extra mellanslag, åäö-varianter).
   - Matcha först exakt, sedan på nyckelord som ingår i rubriken (t.ex. "work email" → e-post, "company name" → företag, "linkedin url" ska inte bli webbplats).
   - Fler synonymer: contact, person, kontaktperson, arbetsgivare, tel, cell, direkt, hemsida, webbadress m.fl.

2. **Innehållsbaserad gissning (fallback)**
   - Om rubriken inte ger svar tittar vi på upp till 20 exempelvärden i kolumnen:
     - e-postmönster → E-post
     - `http(s)://` eller domänmönster → Webbplats
     - telefonmönster (siffror, +, mellanslag, minst 7 siffror) → Telefon
     - två ord med versal begynnelsebokstav → Fullständigt namn
   - Endast om fältet inte redan är taget.

3. **Tydlig och ändringsbar gissning i UI**
   - Kolumner som auto-mappats får en liten "Auto"-badge bredvid fältväljaren.
   - Badgen försvinner när användaren ändrar valet manuellt.
   - Knapp "Gissa om" som återställer till automatiska förslag, plus "Rensa alla" som sätter allt till ignorera.
   - Kort hjälptext: förslagen är gissningar – ändra vid behov.

## Teknisk omfattning

Endast `src/components/CsvColumnMapper.tsx`:
- Ersätt `HEADER_GUESS`-uppslaget med en `guessMapping(headers, rows)`-funktion (rubrikregler + värdeanalys, konfliktskydd så samma fält inte används två gånger).
- Nytt state för vilka kolumner som är auto-gissade, samt knappar för att gissa om / rensa.
- Ingen databas- eller importlogik ändras.
