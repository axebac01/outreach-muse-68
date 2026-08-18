# Sista testkampanjen före skarp start

Vi kör ett komplett slutprov på befintlig testkampanj "TEST – leveransverifiering" (3 avsändare, 5 leads) — nollställd så allt körs från steg 1 igen.

## Nollställning först

Nuvarande läge i databasen: alla riktiga testleads står som `replied`, ett lead är `bounced`, och `axebac01@gmail.com` ligger avregistrerad sedan förra testet. Inget nytt skickas förrän vi rensar detta.

- Ta bort avregistreringen för axebac01@gmail.com.
- Sätt leads tillbaka till `active` med `current_step = 0`.
- Rensa gamla `scheduled_sends`, `email_messages` och svar för testsekvensen så resultatet blir entydigt.
- Behåll det påhittade leadet (ogiltig domän) så vi ser att bounce/fel fångas igen.

## Vad som testas

1. **Steg 1** går ut till alla tre riktiga adresser (Gmail, crmdata, rekryterar) från de tre bisdata-avsändarna.
2. **Region**: kontroll att sändningen kör från Frankfurt så Websupport inte geoblockar (551-felet från förra gången).
3. **Rubriker och avsändare**: å/ä/ö i ämne och avsändarnamn, namn syns i både Gmail och Outlook.
4. **Trådning**: tidsresa på steg 2 och steg 3 — båda ska hamna i samma tråd, även i Outlook (References-kedjan).
5. **Avregistrering**: du klickar länken i sidfoten på ett mejl → adressen blockeras och kommande steg ställs in.
6. **Svar stoppar sekvensen**: du svarar från en av adresserna → inkorgssynken plockar upp svaret, leadet blir `replied` och resten avbryts.
7. **Unibox**: svaret syns med rätt konto i kontofiltret.
8. **Statistik**: kampanjöversikt och analyssidan visar rätt antal skickade, svar och avregistrerade.
9. **Fel hanteras**: det ogiltiga leadet markeras som misslyckat/bounced, inte tyst tappat.

## Så går det till

Jag nollställer, startar kampanjen och rapporterar när steg 1 gått iväg. Du kollar inkorgarna, svarar från en adress och klickar avregistrera i en annan. Sedan tidsreser jag steg 2 och 3 och vi går igenom resultatet punkt för punkt.

## Tekniska detaljer

- `delete from unsubscribes where email='axebac01@gmail.com'`; `sequence_leads` → `status='active', current_step=0`; rensa `scheduled_sends`/`email_messages` för `sequence_id = 4ed83fca-...`.
- Start via `launch-sequence`; tidsresa med `scheduled_for = now() - interval '1 minute'` per steg.
- Kontroller mot `scheduled_sends` (status, error_message, cancelled_reason), `email_messages` (thread_key, in_reply_to, references), `unsubscribes`, `sequence_leads` samt edge-loggar för region.
- Inga kodändringar planeras; fel som hittas åtgärdas som separata fixar.
