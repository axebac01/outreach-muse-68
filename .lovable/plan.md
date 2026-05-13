## Mål
Visa tydlig bekräftelse när autosave sparar ändringar i en kampanj, så det inte känns osäkert om datan kommer fram.

## Approach
En subtil, global "Sparar… / Sparat ✓" indikator (likt Notion/Linear) — bättre än toast som blir spammigt vid varje knapptryck under autosave-debouncen.

Komplettera med en `toast.error(...)` ifall sparning faktiskt misslyckas.

## Implementation

### 1. Ny hook `useSaveStatus`
`src/hooks/useSaveStatus.ts` — Zustand- eller Context-baserad global store med tre states: `idle | saving | saved | error`. Visar "Sparat ✓" i ~2s efter senaste lyckade mutation, sen tillbaka till `idle`.

### 2. Ny komponent `SaveStatusIndicator`
`src/components/SaveStatusIndicator.tsx` — liten textbadge med ikon (Loader2 spin / Check / AlertCircle) som visar nuvarande status. Placeras i kampanjens header (`CampaignDetails.tsx`) bredvid kampanjnamnet.

### 3. Koppla in i autosave-mutationerna
Lägg till `onMutate`/`onSuccess`/`onError` som anropar store-actions i:
- `useUpdateCampaign` (kampanjnamn, Overview-fält, Schedule, Senders, Settings)
- `useUpdateSequenceStep` och övriga sequence-mutations som triggas av debounce i `SequenceStepCard.tsx`

Görs centralt i hooks → automatiskt täckning för alla flikar (Overview, Sequence, Schedule, Senders, Leads, Settings).

### 4. Felhantering
Vid `onError`: status = `error` + `toast.error("Kunde inte spara ändringen")` med felmeddelandet.

## Filer som ändras
- ny: `src/hooks/useSaveStatus.ts`
- ny: `src/components/SaveStatusIndicator.tsx`
- `src/hooks/useCampaigns.ts` — koppla status i `useUpdateCampaign`
- `src/hooks/useSequence.ts` — koppla status i relevanta update-mutations
- `src/pages/CampaignDetails.tsx` — rendera `<SaveStatusIndicator />` i headern

Inga DB- eller backendändringar.
