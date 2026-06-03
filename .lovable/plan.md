## Mål
På varje **avslöjad** lead-kort i sökresultatet på `/leads` ska det finnas en tydlig knapp för att importera just den leaden till en kampanj (utan att gå omvägen via Mina leads).

## Vad som ändras

**Fil:** `src/pages/Leads.tsx` (endast UI + en återanvänd mutation — ingen backend-ändring)

1. **Ny knapp på avslöjade kort** (i höger sida av kortets header-rad, bredvid Avslöjad-badgen):
   - Primärt utseende: `Button size="sm"` med ikon `Send` + text **"Importera till kampanj"**.
   - Vid klick öppnas en `DropdownMenu` med:
     - Lista över användarens kampanjer (samma `sequences`-data som redan finns i komponenten).
     - Separator + **"+ Skapa ny kampanj…"** som öppnar befintlig `CreateCampaignInlineDialog`.
   - När man väljer en kampanj körs en ny liten mutation `importSingleMutation` som anropar `supabase.functions.invoke("leads-import", { body: { sequence_id, marketplace_lead_ids: [revealed.id] } })`.
   - Toast: "Importerad till {kampanjnamn}" med en sekundär "Visa kampanj"-action som navigerar till `/campaign/{campaignId}`.

2. **Visa importstatus per lead:**
   - Lokal `Set<string>` `importedLeadIds` håller koll på leads som importerats i sessionen.
   - När en lead finns i setet byts knappen mot en disabled `Badge`/`Button` med `Check` + "Importerad" och en liten länk "Importera till annan kampanj" som öppnar dropdownen igen.

3. **Inga andra ändringar** — sticky footer, multi-select-flödet och övriga lägen lämnas orörda. Detta är ett komplement, inte en ersättning.

## Tekniska detaljer

- Återanvänder befintlig `useCampaigns`-data (redan importerad i Leads.tsx via `sequences`).
- Återanvänder befintlig edge function `leads-import` (ingen ändring).
- Återanvänder befintlig `CreateCampaignInlineDialog`.
- Ny ikon: `Send` från `lucide-react` (redan tillgänglig).
- Knappen visas endast när `isRevealed === true`.

## Out of scope
- Bulk-import av flera redan-avslöjade leads från sökresultat (kan göras separat senare via fliken "Sparade" + checkbox).
- Ändringar i `MyLeadsTab` eller backend.