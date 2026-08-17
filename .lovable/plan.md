# Sök bland leads i en kampanj

Lägg till ett sökfält i Leads-fliken så att du snabbt hittar en specifik lead bland tusentals.

## Så fungerar det

- Ett sökfält högst upp i "Leads"-kortet, bredvid statusfiltret.
- Söker samtidigt i e-post, namn (för-/efternamn/fullständigt), företag och webbplats.
- Fritextsök, skiftlägesokänsligt, träffar delsträngar (t.ex. "anna" hittar anna@…, Anna Svensson).
- Kombineras med statusfiltret (båda gäller samtidigt).
- Sidnumreringen nollställs till sida 1 vid ny sökning, och räknaren visar "Visar X–Y av Z (filtrerat av totalt)".
- Kryss för att rensa sökningen; tomt resultat visar "Inga leads matchar din sökning".

## Teknisk detalj

- Endast frontend i `src/components/campaign/LeadsTab.tsx`. Alla leads hämtas redan i klienten via `useSequenceLeads` (paginerad hämtning av alla rader), så sökningen körs lokalt i `filteredLeads`-memon — inga databas- eller backend-ändringar.
- Söktermen debounceas lätt (~150 ms) så listan känns snabb även vid 4000+ leads.
