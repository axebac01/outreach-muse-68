# Mejlet från Anthon Paulsson och "Analyserar…" som aldrig blir klar

## Vad mejlet är

Mejlet med ämnet "Anthon Paulsson skickade en fil till dig" kom 4 september till oskar@bisdata-kampanj.se. Det är inget svar på din kampanj — det ligger utanför alla dina kampanjer och avsändaren finns inte bland dina leads.

Innehållet har alla tecken på bluff: ett påstående om "för stora bilagor", en delningslänk till en helt orelaterad designtjänst med en tidsbegränsad förhandsgranskningstoken, prat om ett "säkert PDF-förslag" som inte finns bifogat, och en snygg signatur med riktiga företagsuppgifter för att se trovärdigt ut. Det är ett mycket vanligt upplägg: antingen är hans mejlkonto kapat, eller så är avsändaradressen förfalskad.

Rekommendation: klicka inte på länken, svara inte, och ring gärna Partega på deras växelnummer från deras egen webbplats om du vill varna dem. Länken bör inte öppnas alls.

## Varför det står "Analyserar…" i all evighet

AI-analysen startas bara automatiskt för svar som hör till en kampanj. Det här mejlet gör inte det, så analysen startade aldrig. Men märket i gränssnittet visas så fort ett mejl saknar analys — utan att något faktiskt pågår. Därför snurrar det för alltid. Just nu ligger 17 inkommande mejl i det läget hos dig.

## Vad som ska ändras

1. Ta bort den falska "Analyserar…"-snurran. Ett mejl som inte har analyserats visar i stället inget märke alls, och knappen bredvid heter "Analysera" (inte "Analysera om"). Snurran visas bara när en analys verkligen körs just nu.
2. Lägg till en tydlig markering i inkorgen för mejl som inte hör till någon kampanj, så att det syns direkt att det är utanför din outreach.
3. Varningsmärke för misstänkt mejl: när ett inkommande mejl utanför kampanjerna innehåller typiska bluffsignaler (delad fil- eller dokumentlänk, "bilagan var för stor", länk till annan domän än avsändarens) visas en diskret varning "Kan vara bluff — klicka inte på länkar" ovanför meddelandet.
4. Länkar i inkommande mejl som visas i inkorgen ska inte vara klickbara direkt för mejl utanför kampanjer; adressen visas som text så att du ser vart den leder.

## Tekniska detaljer

- `src/pages/Inbox.tsx`: villkoret på rad ~408 (`!ai_analyzed_at && !ai_analysis_error` → snurra) byts mot `analyzing`-state; knapptexten blir dynamisk. Ny badge när `is_lead_related` är falskt.
- Enkel heuristik i en ny hjälpfil (`src/lib/suspiciousEmail.ts`) som körs på klienten över `body_text`/`snippet` — inga AI-anrop, inga kostnader.
- Ingen ändring i `sync-inbox` eller `analyze-inbound-email`: att inte analysera icke-kampanjmejl är avsiktligt och sparar AI-krediter. Du kan fortfarande köra analysen manuellt med knappen.
