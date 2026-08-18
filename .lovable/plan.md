# Analys av skarpa kampanjen "Bisdata: Generationsskifte" + åtgärder mot bounces

## Vad studsmejlen betyder

"Undelivered Mail Returned to Sender" från `mailer-daemon@...websupport.se` är Websupports egen studsrapport: mejlet kunde inte levereras till mottagaren. Det är alltså inte fel på din avsändare eller på utskicksmotorn — mottagaradresserna finns inte.

Felkoderna i studsarna bekräftar det: 5.1.1 / 5.4.1 (adressen finns inte), 5.1.0 och 5.4.4 (mottagardomänen går inte att nå).

## Läget just nu (avläst i databasen)

- 317 leads i kampanjen, 24 mejl utskickade (12 från kevin@, 12 från oskar@).
- 9 hårda studsar av 24 = **37 % bounce-rate**. Normalt tak är 2–3 %.
- Systemet gjorde rätt: de 9 leadsen markerades som `bounced` och deras 9 planerade uppföljningar avbröts automatiskt (`cancelled_reason: bounce`).
- 308 utskick ligger fortfarande schemalagda fram till 24 augusti. Kampanjen står som pausad.
- Inga svar registrerade ännu på den här kampanjen.

## Var kommer skräpadresserna ifrån?

Kontrollerat i databasen: samtliga 317 leads lades in i en och samma import 18 augusti kl. 10:35 (lokal tid), ingen av adresserna finns i MailLeads egen leadsdatabas (0 träffar mot `marketplace_leads`), och det finns ingen kod i MailLead som gissar eller konstruerar mejladresser.

Slutsats: **innehållet kommer från filen du laddade upp**, inte från MailLead. Exempel ur raderna:

- `cfo@curamet.se` med namnet `[Name of CFO]` — en ifylld mall från källan.
- `jane.smith@...`, `janesmith@...`, `cfo@example.com` med namn som "CFO Name", "Name Surname".

Det ser ut som en lista där en AI eller ett scrapingverktyg har fyllt i platshållare när den inte hittade en riktig kontaktperson, och sedan gissat adressmönster på företagets domän.

Det enda MailLead gör med fälten är att dela upp `full_name` i för- och efternamn (därav `first_name = "[Name"`), och att härleda namn/företag från adressen om kolumnen är tom. Inga adresser hittas på eller ändras.

Fortsätter kampanjen som den är bränner den avsändardomänen `bisdata-kampanj.se` och Websupport kan spärra kontona.


## Åtgärdsplan

### 1. Stoppa blödningen nu (data)
- Ta bort/avbryt de 36 leadsen med uppenbart falska adresser (`@example.com`, `john.doe@`, `jane.smith@`, `example@`, `test@`) och deras schemalagda utskick.
- Rekommendation till dig: rensa också de rollbaserade adresserna, eller lägg dem i en separat, långsammare kampanj.

### 2. Blockera skräpadresser vid import
- Ny validering som körs vid CSV-import och vid import från leads-databasen: uppenbart falska mönster (exempeldomäner, platshållarnamn, ogiltigt format, dubbletter) plockas bort automatiskt, och du får en sammanfattning: "312 importerade, 5 uteslutna (falsk adress)".
- Även platshållare i namnfältet flaggas: text inom hakparenteser (`[Name of CFO]`), "Name Surname", "CFO Name" och liknande — annars skickas mejl som börjar "Hej [Name of CFO]".
- Rollbaserade adresser markeras som varning, inte hårt stopp — du väljer själv.

### 3. Förkontroll före start
- `PreLaunchChecklist` får en ny rad: "Listkvalitet" som visar andel riskadresser och blockerar start om mer än 5 % av listan ser falsk ut.

### 4. Automatisk nödbroms under pågående kampanj
- Idag pausas bara ett enskilt mejlkonto vid 8 % bounce, och först efter 20 utskick från det kontot — därför slog den aldrig till här (12 utskick per konto).
- Ny regel på kampanjnivå: när minst 20 mejl skickats i kampanjen och bounce-raten överstiger 8 %, pausas hela kampanjen automatiskt och du får ett tydligt meddelande om orsaken.

### 5. Synlighet i appen
- Kampanjöversikten visar bounce-antal och bounce-rate bredvid skickat/öppnat/svar, med färgvarning över 3 %.

## Teknisk detalj

- Ny `src/lib/emailAddressQuality.ts`: `classifyRecipient(email)` -> `ok | risky | invalid` med mönster för exempeldomäner, platshållarnamn, rollprefix och formatkontroll. Används av `CsvColumnMapper.tsx`, `import-leads`/`leads-import` samt `PreLaunchChecklist.tsx`.
- Migration: uppdatera `auto_pause_on_high_bounce_rate` så den även räknar per `sequence_id` och sätter `sequences.status = 'paused'` + orsaksfält när tröskeln nås.
- Engångs-SQL för punkt 1: markera leads som `invalid` och sätt deras `scheduled_sends` till `cancelled` med `cancelled_reason = 'invalid_address'`.
- `OverviewTab.tsx`: hämta bounce-antal från `sequence_leads.status = 'bounced'` och visa rate mot antal skickade.

## Att notera utanför denna plan

- Kontot `axebac01@gmail.com` och `crmdatasverige@gmail.com` står som `error` och används inte i utskicken. `hampus@bisdata-kampanj.se` är aktivt men ingår inte i kampanjens avsändare — bara kevin@ och oskar@ roterar. Säg till om du vill ha med fler avsändare, det sprider volymen bättre.
