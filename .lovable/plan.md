# Byt mejltexter i Insynia v2

Kampanjen "Insynia v2 – Redovisningskonsulter" är fortfarande ett utkast. Inget har skickats.

## Vad som ändras
Alla tre mejl byts mot de nya texterna, ordagrant. Väntetiden är kvar på 0, 4 och 5 dagar.

1. **Från redovisning till rådgivning**
2. **Vad är er egen redovisningsbyrå värd?**
3. **Prova först – bestäm sedan**

- **Hälsning:** Texterna börjar med "Hej,". Den ersätts med den automatiska hälsningen, som blir "Hej Förnamn," när det finns ett namn och annars "Hej,". Säg till om du hellre vill ha "Hej," till alla.
- **Länk:** Varje "insynia.se" blir en klickbar länk till https://insynia.se.
- **Punktlistor** (mejl 1 och 3) blir riktiga listor. Pilraden i mejl 2 står kvar som den är.
- **Signatur:** "Vänliga hälsningar / Johan Pokorny / Bisdata / Insynia" skrivs in exakt så i texten, i stället för avsändarens egen signatur. Mejlen skickas fortfarande från Kevins och Oskars adresser.
- **Avregistrering:** En avregistreringslänk läggs automatiskt längst ner i varje mejl. Gmail och Outlook får också en avregistreringsknapp med ett klick. Det behövs alltså ingen egen länk i texten.

## Kontroll
- Läs tillbaka de tre stegen och kontrollera ämnesrader, länkar och väntetider.
- Visa ett exempel på hur ett mejl ser ut, med och utan förnamn.
- Kampanjen ligger kvar som utkast. Du startar den själv.

## Tekniska detaljer
- Uppdatera `sequence_steps` (step_order 0–2) för sekvensen som hör till kampanjen `c4f9915d-…`. Ändra bara subject och body, som HTML: `<p>`, `<ul><li>` och `<a href="https://insynia.se">insynia.se</a>`.
- Den första raden "Hej," ersätts med `{{greeting}}`. Ingen ändring i koden.
