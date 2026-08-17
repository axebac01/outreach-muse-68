# Fixa trasiga mejlrubriker och avregistreringslänken

Två saker kvarstår efter testet. Den ena är en bekräftad bugg i SMTP-biblioteket vi använder, den andra är att sajten inte publicerats om.

## 1. Ämnesrad och avsändarnamn är fortfarande trasiga (bugg i biblioteket)

Det är inte vår kodning som är fel längre — biblioteket som pratar SMTP (denomailer 1.6.0) bygger rubrikerna själv och gör det felaktigt. Kontrollerat i bibliotekets källkod:

- Ämne och avsändarnamn kodas med en metod som inte kodar mellanslag och som bryter raden mitt i den kodade texten. Resultatet blir exakt det du ser: `=?utf-8?Q?[TEST 2/3] Uppf=c3=b6ljning ...` med resten (`kas?=`) på nästa rad. Mejlklienter kan då inte avkoda och visar rå text.
- Rubriken för trådning skrivs som `InReplyTo:` i stället för `In-Reply-To:` — det är ett påhittat rubriknamn. Därför trådas inte uppföljningarna korrekt i Gmail (det syns i din källkod).
- Det finns ingen nyare version av biblioteket som fixar detta (1.6.0 är senaste).

Fix: sluta använda biblioteket för att bygga meddelandet. Vi bygger redan ett korrekt RFC-meddelande själva för Gmail- och Outlook-vägen (det är därför de mejlen ser rätt ut). Vi lägger till en egen liten SMTP-klient som skickar exakt det meddelandet, med korrekt kodade rubriker och rätt rubriknamn.

Notera: brödtexten i det du klistrade in är faktiskt korrekt — `=c3=a4` är normal transportkodning som mejlklienten avkodar till "ä". Den ser konstig ut bara i råkällan. Rubrikerna är däremot verkligt trasiga.

## 2. Avregistreringssidan ger 404

Rätt gissat: `/avregistrera` finns i koden men den publicerade sajten kördes innan sidan lades till. Den behöver publiceras om, sedan fungerar länken.

Länken du klickade på var dessutom avkapad — i råkällan bryts den över flera rader (`=` i slutet av raden betyder "fortsätter"). I en riktig mejlklient kommer hela länken med. Jag kortar ändå ned länken så den blir mindre känslig för radbrytning och ser renare ut i mejlet.

## 3. Nytt verifieringstest

När fixarna är deployade: nytt utskick av steg 1 och steg 2 till dina tre adresser, där vi kontrollerar läsbar ämnesrad med å/ä/ö, korrekt avsändarnamn, att uppföljningen hamnar i samma tråd i Gmail, och att avregistreringslänken öppnar den riktiga sidan.

Kvar oförändrat: DMARC saknas och SPF slutar på `?all` för bisdata-kampanj.se. Det påverkar bara skräppostplacering och åtgärdas hos Loopia, inte i koden.

## Tekniska detaljer

- Ny `supabase/functions/_shared/smtp.ts`: minimal SMTP-klient (EHLO, STARTTLS på 587 / implicit TLS på 465, AUTH LOGIN och PLAIN, DATA med dot-stuffing och CRLF), som skickar en färdigbyggd meddelandesträng.
- `send-email/index.ts`: SMTP-grenen använder `buildRfc2822` (samma väg som Gmail) med `encodeMimeWord`/`encodeAddress` för Subject och From, korrekt `In-Reply-To`/`References`, `Message-ID`, `Date` och `List-Unsubscribe`-rubrikerna. Base64 som Content-Transfer-Encoding för text- och html-delarna för att undvika radlängdsproblem.
- `test-smtp/index.ts` byter till samma klient så anslutningstestet och det skarpa utskicket använder samma kodväg.
- denomailer tas bort som beroende.
- Kortare avregistreringslänk: token bakas till ett kort id (tabell med id -> user_id/email, eller kortare HMAC-trunkering) och footerlänken blir `https://maillead.ai/avregistrera?t=<kort id>`. `List-Unsubscribe`-huvudet fortsätter peka på backend-endpointen för ett-kliks-POST.
- Publicering krävs för att `/avregistrera` ska finnas live.
