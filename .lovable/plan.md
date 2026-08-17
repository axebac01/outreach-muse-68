# Nytt testutskick efter fixarna

Ja — fixarna är gjorda i koden men inget mejl har skickats efter dem. Vi kör om samma testkampanj mot dina tre adresser.

## Före utskick

- Deploya om backend-funktionerna som ändrats (utskick, avregistrering, DNS-kontroll) så att den nya koden faktiskt körs.
- Rensa avregistreringen från förra testet: din adress som avregistrerades blockeras annars och får inget mejl.
- Kör om DNS-kontrollen på bisdata-kampanj.se så vi ser aktuell status (SPF/DKIM/DMARC) innan vi skickar.

## Testet

Samma kampanj "TEST – leveransverifiering", återställd till steg 1, med:

- Ämnesrad som medvetet innehåller å/ä/ö, samt avsändarnamn med å/ä/ö på ett av kontona.
- Alla tre avsändarkonton, så vi ser att namnet visas rätt oavsett inkorg.
- Tre mottagare: dina Gmail-, crmdata- och rekryterar-adresser.

Sedan tidsresa på steg 2 (som förra gången) för att se att uppföljningen trådas rätt med den nya kodningen.

## Det du kontrollerar i inkorgen

1. Ämnesraden är läsbar, inga `=?utf-8?Q?`-rester.
2. Avsändarnamnet visas (inte bara adressen) i både Gmail och Outlook.
3. Avregistreringslänken i sidfoten går till maillead.ai/avregistrera och sidan ser ut som resten av appen, med korrekta svenska tecken.
4. Ett-klicks-avregistrering högst upp i Gmail fungerar fortfarande.
5. Var mejlet hamnar: inkorg eller skräppost, per adress.

Jag kontrollerar samtidigt i databasen att status blir "skickat", att trådning och avregistrering registreras korrekt.

## DNS

Punkt 5 ovan blir troligen fortsatt skräppost i Outlook tills DMARC finns och SPF slutar på `~all`. Jag ger dig de exakta posterna att lägga in hos Loopia, och vi mäter placeringen igen efteråt — den delen kräver din åtgärd i DNS.

## Tekniska detaljer

- Deploya `send-email`, `unsubscribe`, `check-deliverability`.
- Ta bort raden i `unsubscribes` för testadressen; sätt `sequence_leads.status` tillbaka till `active` och nollställ `current_step`.
- Nya `scheduled_sends` skapas via kampanjstart; tidsresa med `scheduled_for = now() - interval '1 minute'` på steg 2.
- Kontroller mot `scheduled_sends`, `email_messages` (thread_key/in_reply_to) och `unsubscribes`.
