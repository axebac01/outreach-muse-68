# Insynia v2: nya mejltexter och en snabbare app

## Rättelse
Jag hade fel när jag skrev att inget har skickats. Kampanjen började skicka den 6 oktober. **119 mejl har gått ut** med de gamla texterna. Just nu är kampanjen pausad och inga utskick väntar i kön.

## Del 1: Nya mejltexter
Alla tre mejl byts mot dina nya texter, ordagrant. Väntetiden mellan mejlen är kvar på 0, 4 och 5 dagar.
1. **Från redovisning till rådgivning**
2. **Vad är er egen redovisningsbyrå värd?**
3. **Prova först – bestäm sedan**

- **Hälsning:** Mejlen börjar med "Hej Förnamn," när det finns ett namn och annars med "Hej,".
- **Länk:** Varje "insynia.se" blir en klickbar länk till https://insynia.se.
- **Punktlistor** blir riktiga listor.
- **Signatur:** Varje mejl avslutas med "Vänliga hälsningar / Johan Pokorny / Bisdata / Insynia".
- **Avregistrering:** En avregistreringslänk läggs automatiskt längst ner i varje mejl. Gmail och Outlook får också en avregistreringsknapp med ett klick.
- **De 119 som redan har fått mejl** fortsätter med de nya texterna från nästa steg. Ingen får det första mejlet en gång till.
- Kampanjen förblir pausad. Du startar den själv när du har läst igenom texterna.

## Del 2: Laggigheten
Databasen mår bra (62 % minne, inga larm). Det som gör appen seg är att vissa sökningar läser igenom hela tabeller:
- Mejltrådar i inkorgen tar upp till 7 sekunder att öppna.
- Inkorgssynken kontrollerar varje nytt mejl mot alla mejl som redan finns.
- Sökningar bland leads och dubblettkontroller vid import.

Åtgärd: lägg till genvägar (index) så att databasen hittar rätt rader direkt. Sedan mäter jag igen och jämför.

## Tekniska detaljer
- Uppdatera `sequence_steps` (step_order 0–2) i sekvensen `57d7f537-…`. Ändra bara subject och body, som HTML (`<p>`, `<ul><li>`, `<a>`). Den första raden "Hej," ersätts med `{{greeting}}`.
- Migration med följande index:
  - `email_messages(email_account_id, provider_message_id)`
  - `email_messages(user_id, email_account_id, thread_key, created_at)`
  - `sequence_leads(user_id, lower(email))` med `text_pattern_ops` eller trigram för ilike
- Mät före och efter med `slow_queries` och EXPLAIN.
