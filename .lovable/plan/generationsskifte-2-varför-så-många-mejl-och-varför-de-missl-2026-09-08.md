# Generationsskifte 2: varför så många mejl, och varför de misslyckas

## Vad som faktiskt hänt idag

Kampanjen startade 09:00 svensk tid. Sedan dess:

- 45 mejl skickade
- 30 misslyckade
- 247 kvar i kö

## Varför så många på så kort tid

Gränsen på 25 per dag gäller **per avsändarkonto**, inte per kampanj. Kampanjen har tre konton kopplade: kevin@, oskar@ och hampus@bisdata-kampanj.se. Taket är alltså 75 mejl idag, och de 75 första försöken (45 skickade + 30 misslyckade) gick åt på knappt en halvtimme eftersom systemet bara pausar 30–120 sekunder mellan mejl från samma inkorg.

Två saker är fel i det här:

1. Det syns ingenstans i gränssnittet att "25 per dag" blir 75 när man har tre konton.
2. Misslyckade försök räknas inte av mot dagstaket, men leadet är förbrukat — det försöker aldrig igen.

## Varför mejlen misslyckas

**25 av 30: hampus@bisdata-kampanj.se kan inte logga in.**
Alla 25 misslyckade från det kontot ger "535 authentication failed" — fel eller utgånget SMTP-lösenord. Kontot står ändå som aktivt, så kampanjen fortsatte mata leads till det tills dagskvoten var slut. 25 mottagare är därmed brända utan att ha fått något mejl.

**5 av 30: första mejlsteget är tomt.**
Steg 1 i sekvensen har varken ämnesrad eller text sedan 09:33 idag (de 45 som gick iväg hade rubriken "Har du börjat planera för nästa steg?" — det innehållet finns inte kvar). Utan ämne och text vägrar utskicket och svarar "Missing fields".

## Vad jag föreslår

1. **Stoppa kampanjen direkt** så att inte fler leads bränns medan innehållet saknas.
2. **Återställ steg 1** med ämnet och texten från de 45 mejl som faktiskt skickades (finns sparade i utkorgen).
3. **Skydda mot tomt innehåll**: ett steg utan ämne eller text ska inte kunna sparas tomt över ett steg som redan har innehåll, och en kampanj med tomt steg ska inte kunna vara aktiv.
4. **Pausa konton som nekar inloggning**: vid autentiseringsfel (535/authentication failed) sätts kontot till "behöver återanslutas" direkt efter första felet i stället för efter 25, och kampanjen slutar använda det.
5. **Bränn inte leads i onödan**: misslyckade utskick som beror på avsändaren (inloggning, tomt innehåll) ska läggas tillbaka i kö i stället för att markeras som slutgiltigt misslyckade. De 30 från idag läggs tillbaka.
6. **Tydligare dagstak i gränssnittet**: visa "25 per konto × 3 konton = 75 per dag" på avsändarsidan.

Kevin@ och oskar@ fungerar. Vill du hellre köra bara två konton (50/dag) tills hampus@ är återansluten, säg till så kopplar jag bort det från kampanjen.

## Teknisk detalj

- `process-scheduled-sends`: klassificera SMTP 535/auth-fel som kontofel → sätt `email_accounts.status = 'needs_reconnect'` + `paused_reason`, markera övriga köade som `paused_account_error` i stället för `failed`; behandla `Missing fields` som återställbart (tillbaka till `scheduled`).
- Steg 1 (`sequence_steps` id `e080d704…`) återställs från `email_messages.subject/body_html` för sekvensen.
- Autospar i `useSequence.ts`: blockera tom `body`/`subject`-skrivning över befintligt innehåll.
- `launch-sequence` och `PreLaunchChecklist`: blockera start om något steg saknar ämne eller text.
- `SendersTab`: visa total dagskapacitet (antal aktiva avsändare × dagligt tak).
