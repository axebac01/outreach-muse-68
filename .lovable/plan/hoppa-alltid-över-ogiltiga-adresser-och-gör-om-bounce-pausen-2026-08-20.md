# Hoppa alltid över ogiltiga adresser – och gör om bounce-pausen rättvis

## Vad jag ser i kampanjen Bisdata: Generationsskifte

- Leads: 167 aktiva, 137 ogiltiga, 13 studsade.
- De studsar du ser (`cfo@example.com`, `ceo@example.com`, `example@carlssoncse.se`, `cfo@curamet.se`) kom in **18–19 augusti**, alltså innan vi markerade dem som ogiltiga. Inga nya utskick har gått till ogiltiga leads efter rensningen – deras 137 planerade utskick är avbrutna.
- Kampanjen är pausad med texten "Auto-pausad: 28% studsar (10 av 36 utskick)".

Men systemet är fortfarande sårbart, och det är därför det känns som att den skickar till skräpadresser:

1. **Utskicksmotorn känner inte till statusen "invalid".** Den hoppar bara över `replied`, `unsubscribed`, `bounced`, `completed`. Att de 137 inte fick mejl beror på en manuell rensning av deras köade utskick – inte på en spärr. Markerar du en lead som ogiltig idag ligger dess köade mejl kvar och går iväg.
2. **Ingen kvalitetskoll precis före sändning.** En påhittad adress som slunkit in tidigare (importfiltret är nytt) skickas ändå.
3. **Bounce-pausen räknar all historik.** 13 studsar mot 36 utskick = 36 %. Så fort du återupptar och en enda ny studs kommer pausas kampanjen igen, trots att listan är rensad.

## Vad jag bygger

**1. Spärr i utskicksmotorn (`process-scheduled-sends`)**
- Lägg till `invalid` i listan över statusar som avbryter utskicket (`cancelled_reason: "lead_invalid"`).
- Kör samma kvalitetsklassning som vid import (`emailAddressQuality`) på mottagaren precis innan sändning. Klassas den som `invalid` → skicka inte, markera leaden `invalid` och avbryt utskicket. Det blir sista skyddsnätet oavsett hur adressen kommit in.

**2. Köade utskick avbryts när en lead blir ogiltig**
- Databastrigger på `sequence_leads`: när status ändras till `invalid` eller `unsubscribed`, avbryts automatiskt alla dess `scheduled`/`processing`-utskick. Ingen manuell städning behövs mer.

**3. Rättvis auto-paus**
- Auto-pausen räknar bara utskick och studsar från de senaste 7 dagarna, och kräver minst 20 utskick i det fönstret (samma tröskel som idag, 8 %).
- Vid manuell återstart nollställs `paused_reason`, så gammal historik inte pausar en rensad kampanj direkt igen.
- Bounce-siffran i kampanjöversikten visar fortsatt totalen, men med en notering om att pausregeln tittar på senaste 7 dagarna.

**4. Rensa upp den här kampanjen**
- Kontrollera de 167 kvarvarande aktiva leaden mot kvalitetsreglerna och markera eventuella återstående skräpadresser som ogiltiga innan omstart.
- Nollställ pausorsaken så kampanjen kan startas om utan att direkt pausas av de gamla studsarna.

## Tekniska detaljer

- `supabase/functions/process-scheduled-sends/index.ts`: utöka skip-listan, importera en delad kopia av kvalitetsklassningen till `supabase/functions/_shared/emailAddressQuality.ts` (spegling av `src/lib/emailAddressQuality.ts`).
- Migration: trigger `cancel_sends_on_lead_invalidated` på `sequence_leads` (AFTER UPDATE OF status), samt ny version av `auto_pause_sequence_on_high_bounce_rate` med 7-dagarsfönster.
- `src/hooks/useSequence.ts`: nollställ `paused_reason`/`paused_at` när status sätts till `active`.
- Dataåtgärd (ingen schemaändring) för att rensa kvarvarande leads och pausorsak i Bisdata-kampanjen.
