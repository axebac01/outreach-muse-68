# Smidigare kolumnmappning vid CSV-import

## Mål
Mappningssteget ska gå att göra utan att skrolla i sidled, och webbplats ska kunna importeras.

## 1. Nytt fält: Website
- Lägg till `website` som valbart lead-fält i mappningen (med automatisk gissning på rubriker som `website`, `url`, `site`, `hemsida`, `webbplats`, `domain`).
- Databasen saknar idag kolumnen `website` på leads-tabellen, så den läggs till (text, valfri) och sparas vid import.

## 2. Ny layout: vertikal lista istället för bred tabell
Dagens mappning renderas som en tabell med en kolumn per CSV-kolumn, vilket tvingar fram sidledsskroll (särskilt på mobil/smal skärm).

Ny layout: en rad per CSV-kolumn, staplade vertikalt.

```text
┌────────────────────────────────────────────┐
│ E-post adress            →  [ E-post   ▾ ] │
│ exempel: anna@foretag.se                   │
├────────────────────────────────────────────┤
│ Företag                  →  [ Företag  ▾ ] │
│ exempel: Acme AB                           │
├────────────────────────────────────────────┤
│ Kommentar                →  [ Ignorera ▾ ] │
│ exempel: ringde i mars                     │
└────────────────────────────────────────────┘
```

Varje rad visar: CSV-rubriken, ett par exempelvärden från filen, och en väljare för vilket lead-fält kolumnen ska mappas till. På smal skärm hamnar väljaren under rubriken.

## 3. Smidighetsdetaljer
- Redan mappade fält gråas ut i övriga väljare så samma fält inte kan väljas två gånger.
- Omappade kolumner sorteras inte om, men "Ignorera" är fortsatt standard när ingen gissning träffar.
- Sammanfattningen (giltiga / dubbletter / ogiltiga) och importknappen ligger kvar längst ned och blir sticky så den alltid är nåbar.
- Filens totala antal rader visas ovanför listan.

## Tekniskt
- Migration: `alter table public.sequence_leads add column website text`.
- `src/components/CsvColumnMapper.tsx`: byt tabell-layout mot vertikal lista, lägg till `website` i `LEAD_FIELDS` och `HEADER_GUESS`, förhindra dubbelmappning.
- `src/hooks/useSequence.ts` (`useAddSequenceLeads`): skicka med `website`.
- `src/integrations/supabase/types.ts` regenereras av migrationen.
