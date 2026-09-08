# Varför första mejlet tömdes

## Vad som faktiskt hände

Din vy hade rätt — texten fanns. Den försvann av sig själv, och orsaken är hittad.

När du öppnar fliken Sekvens finns det en säkerhetsfunktion som ska skapa ett tomt första mejl åt dig om kampanjen inte har något steg alls. Problemet: den kollar detta i samma ögonblick som sidan laddas, innan stegen hunnit hämtas från databasen. Under den bråkdelen av en sekund ser den "noll steg" och skapar ett tomt första mejl.

Tidigare krockade det tomma steget med det befintliga och avvisades av databasen — det var precis det felmeddelandet du klagade på ("duplicate key value…"). När det felet togs bort i går skrivs det tomma steget i stället över det befintliga. Alltså: irritationsmomentet försvann, men skyddet försvann med det.

Det stämmer med tiderna: första steget i Generationsskifte 2 tömdes 09:33 lokal tid, kort efter att den ändringen gick live, och inget annat rörde steget.

## Vad jag åtgärdar

1. Vänta in datan. Det tomma första steget skapas bara när stegen faktiskt är hämtade och listan bevisligen är tom — inte medan sidan laddar.
2. Dubbelt skydd i sparlogiken. Ett steg utan innehåll får aldrig skriva över ett steg som redan har ämne eller text, oavsett vilken väg sparningen tar. Skyddet finns redan för steg som sparas med id; nu gäller det även när ett steg skapas.
3. Kontroll på serversidan finns redan sedan i går: en kampanj kan inte startas, och utskick pausas i stället för att brännas, om ett steg saknar innehåll.

## Vad du behöver göra

Inget. Texten i Generationsskifte 2 är redan återställd. Kolla igenom den och tryck start när du är nöjd.

## Teknisk detalj

- `src/components/campaign/SequenceTab.tsx`: effekten som säkerställer steg 0 körs på `steps.length === 0` utan att ta hänsyn till query-status. Byts till att kräva att `useSequenceSteps` är klar (`isSuccess`/`isFetched`) och lägger till en ref-spärr så den bara kan köra en gång per sekvens.
- `src/hooks/useSequence.ts`: grenen utan `id` gör i dag `upsert(..., { onConflict: "sequence_id,step_order" })`, vilket skriver över befintligt innehåll. Ändras till att först läsa befintlig rad på `(sequence_id, step_order)` och, om den har ämne eller text, låta den vara orörd i stället för att skriva tomma värden.
