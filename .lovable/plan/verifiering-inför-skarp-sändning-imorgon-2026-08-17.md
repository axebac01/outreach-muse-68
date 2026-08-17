# Verifiering inför skarp sändning imorgon

Målet: bevisa att hela kedjan fungerar — första mejlet, uppföljning efter X dagar, avregistrering och stopp-logiken — utan att vänta i tre dagar och utan att mejla en enda riktig mottagare.

## Testkampanj

Jag skapar en kampanj "TEST – leveransverifiering" på ditt inloggade konto med:

- Avsändare: de anslutna bisdata-kampanj.se-adresserna (hampus, oskar, kevin) — alla tre, så vi också ser att rundgången mellan flera inkorgar fungerar.
- Mottagare (3 leads): axebac01@gmail.com, axel.backstrom@crmdata.se, axel@rekryterar.com — med för- och efternamn samt företag ifyllt så personaliseringen kan verifieras.
- Sekvens: 3 steg med personaliseringsfält i både ämne och brödtext, väntetider 3 respektive 2 dagar (samma upplägg som skarpt).
- Sändningsfönster brett under testet så inget bromsas av tidsfönstret.

Sedan startar jag kampanjen och de tre första mejlen går iväg inom någon minut.

Detta bevisar: SMTP-kontona fungerar, personalisering renderas rätt, mejlen landar i inkorgen, avsändarnamn och signatur ser rätt ut, och leads fördelas mellan flera inkorgar.

## Uppföljning utan att vänta 3 dagar

Så fungerar det idag: när steg 1 skickats skapas raden för steg 2 direkt, med sändningstid = nu + väntetiden. Det osäkra är inte logiken utan att den faktiskt löser ut när tiden passerar.

Jag flyttar sändningstiden för testkampanjens steg 2 bakåt i tiden i databasen — en tidsresa tre dagar framåt. Bakgrundsjobbet kör varje minut, så uppföljningen ska gå iväg direkt. Samma sak för steg 3. Vi kontrollerar att:

- uppföljningen kommer fram och hamnar i samma mejltråd som första mejlet (svarsrubrik/tråd-id)
- nästa steg schemaläggs automatiskt efter varje skickat mejl
- efter sista steget markeras leadet som klart och inga fler mejl skapas
- 30–120-sekundersfördröjningen mellan mejl från samma inkorg respekteras

## Avregistrering

Du klickar på avregistrera-länken i ett av testmejlen. Jag kontrollerar att:

- adressen hamnar bland avregistrerade
- leadet får status "unsubscribed"
- kommande schemalagda mejl till adressen avbryts i stället för att skickas
- ett nytt mejl till samma adress blockeras även om det schemaläggs på nytt

Jag testar även ett-klicks-avregistrering (knappen som Gmail/Outlook visar högst upp i mejlet) eftersom den går en annan väg än länken i sidfoten, samt att avregistrera-sidan visas korrekt.

## Stopp- och säkerhetskontroller

- Du svarar på ett testmejl → resterande steg till det leadet ska avbrytas (kräver att inkorgssynken hunnit köra, den går var tionde minut).
- Jag pausar kampanjen → inget mer går iväg.
- Dagligt tak och sändningsfönster: verifieras genom att sätta taket lågt en stund och se att överskjutande mejl skjuts till nästa dag i stället för att skickas.
- Ogiltig mottagaradress: ett lead med en påhittad adress för att se att felet fångas och syns som misslyckat i stället för att tysta försvinna.

## Grönt ljus för den skarpa kampanjen

Före start går vi igenom: rätt avsändarkonton, DNS-status (SPF/DKIM/DMARC) grön för bisdata-kampanj.se, dagligt tak max 25 per konto, sändningsfönster i rätt tidszon, inga "test" kvar i ämnesraderna och att antalet leads stämmer. Efter start bevakar jag de första minuterna att mejlen får status "skickat" och inte fastnar. Testkampanjen pausas och kan tas bort efteråt.

## Tekniska detaljer

- Testdata skapas i `campaigns`/`sequences`/`sequence_steps`/`sequence_leads`/`sequence_senders` för din användare; inga produktionsrader rörs.
- Tidsresan görs med `update scheduled_sends set scheduled_for = now() - interval '1 minute'` filtrerat på testkampanjens `sequence_id`.
- `process-scheduled-sends` körs varje minut via cron (verifierat aktivt).
- Kontroller mot `scheduled_sends` (status, cancelled_reason, error_message), `email_messages` (thread_key, in_reply_to), `unsubscribes` och `sequence_leads`.
- Inga kodändringar planeras; om ett fel hittas åtgärdas det som en separat, avgränsad fix.
