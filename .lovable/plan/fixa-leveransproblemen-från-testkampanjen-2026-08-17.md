# Fixa leveransproblemen från testkampanjen

Fyra separata fel bekräftade i test. Tre är buggar i koden, ett är DNS på avsändardomänen.

## 1. Trasig ämnesrad (bugg)

Ämnet blev `=?utf-8?Q?=3d?UTF-8?B?W1RFU1Q...`. Vi MIME-kodar ämnet själva och skickar sedan den redan kodade strängen till SMTP-biblioteket, som kodar en gång till. Samma sak gäller avsändarnamnet, så namn med å/ä/ö skulle bli lika trasiga.

Fix: skicka rå text (ämne och avsändarnamn) på SMTP-vägen och låt biblioteket sköta kodningen. Egen kodning behålls bara för Gmail/Outlook-API-vägen där vi bygger meddelandet själva.

## 2. Avregistreringssidan ser trasig ut

Sidan serveras direkt från backend-funktionen, och plattformens gateway skickar den som `text/plain` med en säkerhetspolicy som blockerar all styling. Därför blev det osminkad text och trasiga tecken ("Ã¤" i stället för "ä").

Fix: flytta sidan in i appen.
- Ny route `/avregistrera` i appen med riktig MailLead-design, på svenska, som visar bekräftelse eller fel.
- Backend-funktionen behåller själva avregistreringen men svarar med JSON till den sidan.
- Fotlänken i mejlen pekar på appens adress i stället för backend-adressen (kortare länk, eget varumärke, bättre för spamfiltren).
- Ett-klicks-avregistrering i mejlhuvudet (som Gmail/Outlook använder) pekar fortsatt på backend-endpointen, eftersom den måste ta emot POST.

Länken du klickade på gav "NOT_FOUND" för att adressen bröts på mitten när du kopierade den ur mejlkällan. Kortare länk minskar risken för det i verkliga klienter också.

## 3. Mejlen hamnar i skräpposten

Kontroll av `bisdata-kampanj.se` just nu:
- DKIM: finns och är korrekt (selector `mail`).
- SPF: finns men slutar på `?all` (neutral) — svag, ger ingen tydlig signal.
- DMARC: saknas helt.

Utan DMARC och med neutral SPF hamnar kallmejl nästan alltid i skräpposten hos Outlook. Detta går inte att lösa i koden — posterna måste läggas till hos DNS-leverantören (Loopia).

Fix i produkten:
- Uppdatera DNS-guiden så den föreslår `v=spf1 ... ~all` i stället för att bara påpeka att SPF finns, och flaggar `?all` som varning.
- Höj varningen i appen: konton med saknad DMARC visas som "risk för skräppost" i förkontrollen innan kampanjstart, inte bara som en liten notis.
- Du lägger själv in DMARC-posten (`v=DMARC1; p=none; rua=...`) och byter `?all` mot `~all` hos Loopia — jag visar de exakta posterna att kopiera.

## 4. Avsändarnamn saknades i första mejlet

Alla tre konton har namn sparade, så första mejlet borde inte ha visat bara adressen. Orsaken är inte bekräftad. Jag testar avsändarrubriken igen efter kodningsfixen i punkt 1 och kontrollerar hur namnet ser ut i både Gmail och Outlook innan vi går vidare.

## Verifiering efter fixarna

Nytt testutskick till dina tre adresser, där jag kontrollerar: läsbar ämnesrad med å/ä/ö, korrekt avsändarnamn, att avregistreringssidan visas med rätt design och tecken, samt var mejlet hamnar (inkorg/skräppost) före och efter att DNS-posterna lagts in.

## Tekniska detaljer

- `supabase/functions/send-email/index.ts`: ta bort `encodeMimeWord`/`encodeAddress` på denomailer-anropet; behåll dem i `buildRfc2822` för API-vägarna.
- `supabase/functions/unsubscribe/index.ts`: GET returnerar JSON (eller redirect till appens `/avregistrera`), POST behåller ett-klicks-beteendet.
- Ny sida `src/pages/Unsubscribe.tsx` + route, anropar funktionen och renderar resultatet.
- `buildUnsubscribeUrl`: två varianter — publik app-URL för fotlänken, funktions-URL för `List-Unsubscribe`-huvudet.
- `src/lib/dnsGuides.ts` + `check-deliverability`: bedöm `?all` som varning, tydligare DMARC-krav i förkontrollen (`PreLaunchChecklist.tsx`).
