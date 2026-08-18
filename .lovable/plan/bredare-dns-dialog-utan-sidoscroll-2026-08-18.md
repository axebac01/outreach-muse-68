# Bredare DNS-dialog utan sidoscroll

DNS-guiden ("Så här fixar du dina DNS-poster") är för smal, och de långa DNS-värdena (SPF-strängen, `_dmarc.domän.se`, DMARC-värdet) tvingar fram en horisontell scrollbar. Målet: allt innehåll ska rymmas i bredd och långa värden ska brytas över flera rader istället för att sticka ut.

## Vad som ändras

- Dialogen blir bredare på desktop och håller sig inom skärmen på mindre fönster.
- Rubrik och beskrivning kapas inte längre i högerkanten.
- Varje DNS-rad (Typ / Namn / Värde) visar hela värdet med radbrytning i stället för avhuggen text — kopieringsknappen ligger kvar till höger.
- Ingen horisontell scrollbar; vertikal scroll som idag.
- Panellänkarna (Loopia, One.com, ...) fortsätter radbrytas som nu.

## Teknisk detalj

Fil: `src/components/email/DnsFixDialog.tsx`

- `DialogContent`: byt `max-w-lg` mot en bredare, responsiv bredd (t.ex. `w-[calc(100vw-2rem)] sm:max-w-2xl`), behåll `max-h-[85vh] overflow-y-auto` och lägg till `overflow-x-hidden`.
- `RecordRow`: byt `truncate` mot `break-all whitespace-pre-wrap` på `<code>`, ändra raden till `flex items-start` så etikett och kopieringsknapp ligger snyggt mot första raden.
- Inga ändringar i logik, texter eller andra dialoger.
