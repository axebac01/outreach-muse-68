# Verifiering inför skarp sändning imorgon

Målet: bevisa att hela kedjan fungerar — första mejlet, uppföljning efter X dagar, avregistrering, och stopp-logiken — utan att vänta i tre dagar och utan att mejla en enda riktig mottagare.

## Fas 1 — Testkampanj till dina egna adresser

Skapa en separat kampanj (inte den skarpa) med 2–3 leads som alla är dina egna mejladresser, gärna på olika leverantörer (t.ex. en Gmail, en företagsadress). Samma sekvens-innehåll som den skarpa kampanjen, med samma väntetider.

Detta bevisar: avsändarkontot fungerar, ämne/innehåll och personalisering (`{{first_name}}` m.fl.) renderas rätt, mejlet landar i inkorgen (inte skräppost), och avsändarnamn/signatur ser rätt ut.

## Fas 2 — Uppföljningsmejlet, utan att vänta 3 dagar

Så fungerar det idag: när steg 1 skickas skapas raden för steg 2 direkt, med sändningstid = nu + väntetiden i dagar. Det som är osäkert är inte logiken utan att den faktiskt löser ut när tiden passerar.

Verifiering: efter att steg 1 gått iväg i testkampanjen flyttar jag sändningstiden för det schemalagda steg 2 bakåt i tiden i databasen (bara för dina testleads). Bakgrundsjobbet kör varje minut, så uppföljningen ska då gå iväg inom någon minut — som en tidsresa tre dagar framåt. Vi kontrollerar att:

- uppföljningen kommer fram och hamnar i samma mejltråd som första mejlet
- steg 3 (om det finns) automatiskt schemaläggs efter det
- efter sista steget markeras leadet som klart och inga fler mejl skapas

## Fas 3 — Avregistrering

I testkampanjen klickar du på avregistrera-länken i mejlet du fått. Jag kontrollerar sedan i databasen att:

- adressen hamnar på avregistrerade
- leadet får status "unsubscribed"
- kommande schemalagda mejl till den adressen ställs in (avbryts) i stället för att skickas
- ett nytt mejl till samma adress blockeras även om det schemaläggs på nytt

Vi testar även ett-klicks-avregistrering (knappen Gmail/Outlook visar högst upp i mejlet), eftersom den går en annan väg än länken i sidfoten.

## Fas 4 — Stopp- och säkerhetskontroller

Snabbtest av det som skyddar dig när det går fel:

- svarar du på ett testmejl ska resterande steg till det leadet avbrytas
- pausar du kampanjen ska inget mer gå iväg
- dagligt tak och sändningsfönster respekteras (kontrolleras i data, inte genom väntan)

## Fas 5 — Grönt ljus för den skarpa kampanjen

Innan start går vi igenom: rätt avsändarkonto, DNS-status (SPF/DKIM/DMARC) grön, dagligt tak max 25 per konto, sändningsfönster satt i rätt tidszon, inga "test" kvar i ämnesraderna, och att antalet leads stämmer. Efter start kollar vi de första 10–15 minuterna att mejl faktiskt får status "skickat" och inte fastnar.

## Tekniska detaljer

- Tidsresan i fas 2 görs med en `update` på `scheduled_sends.scheduled_for` filtrerad på testkampanjens `sequence_id` — inga kodändringar krävs.
- Bakgrundsjobbet `process-scheduled-sends` körs varje minut via cron (verifierat aktivt).
- Kontroller görs mot `scheduled_sends` (status, cancelled_reason, error_message), `email_messages` (tråd-id, in-reply-to), `unsubscribes` och `sequence_leads`.
- Inga produktionsdata rörs; alla ändringar sker på testkampanjens rader.

## Vad jag behöver av dig

1. Bekräfta att jag ska skapa testkampanjen åt dig, eller om du skapar den själv och säger till när steg 1 gått iväg.
2. Vilka mejladresser du vill använda som testmottagare.
