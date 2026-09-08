# Fix: "duplicate key value"-fel vid autosparande av sekvenssteg

## Problem
När du redigerar ett sekvenssteg som ännu inte har fått sitt databas-id (t.ex. det automatiskt skapade första steget innan listan hunnit laddas om, eller steg som AI:n precis skrivit) gör koden en INSERT med ett `step_order` som redan finns. Databasens unika regel `(sequence_id, step_order)` stoppar det, och det råa Postgres-felmeddelandet visas rakt i autospar-toasten.

## Åtgärd

**1. `src/hooks/useSequence.ts` – `useUpsertStep`**
- Byt INSERT-mot-`upsert` med `onConflict: "sequence_id,step_order"`.
- Resultat: om steget redan finns uppdateras det istället för att kasta fel. Inga dubbletter kan uppstå oavsett timing.

**2. `src/hooks/useSaveStatus.ts` – vänliga felmeddelanden**
- Mappa tekniska databasfel till begriplig svenska i toasten:
  - "duplicate key value" → "Steget fanns redan – ändringen sparades ändå" (eller generiskt "Något gick fel, försök igen")
  - Övriga okända fel → "Något gick fel. Försök igen eller ladda om sidan."
- Råa `err.message` visas aldrig för användaren.

## Tekniska detaljer
- Ingen databasändring behövs – den unika constraint är korrekt och ska finnas kvar; det är klienten som ska upserta istället för att insert:a blint.
- AI-dialogen (`AiWriteSequenceDialog`) raderar och skriver om steg vid befintligt innehåll – den berörs inte, men samma upsert-logik skyddar även den vägen.
- Verifiering: redigera steg direkt efter sidladdning, skriv om med AI, lägg till/ta bort uppföljning – inga feltoasts ska synas.
