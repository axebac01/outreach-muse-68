## Mål
Göra "Sparar… / Sparat ✓"-indikatorn konsekvent i hela appen och förbättra robustheten kring autosave.

## Var den ska in (consistency)

Indikatorn finns idag bara i kampanjheadern. Flytta den till **`src/components/Layout.tsx`** (i toppraden, t.ex. höger om logotypen/navigationen) så att den syns globalt på alla sidor. Tas bort från `CampaignDetails.tsx` för att undvika dubbelt.

Koppla `saveStatusStore` till alla mutationer som triggas implicit (utan egen "Spara"-knapp), eftersom det är där osäkerheten finns:

| Hook | Mutation | Var i UI |
|---|---|---|
| `useProfile.ts` | `useUpdateProfile` | Settings (namn, företag) |
| `useEmailAccounts.ts` | `useUpdateEmailAccount` | EmailAccounts (toggle aktiv, daily limit, signature) |
| `useSendingLimits.ts` | update-mutation | EmailAccounts/Settings |
| `useInbound.ts` | (om inline-redigering finns) | TrackingSettings |

**Skippas avsiktligt** (de har egna explicit success/fel-toasts eller dialog-confirm): `useCreateCampaign`, `useDeleteCampaign`, `useDeleteSequenceLead`, `useAddSequenceLeads`, `useCreate/RevokeApiKey`, `useCreate/DeleteTrackingSite`, send-test-email m.fl. Dubbla notifikationer blir störande.

## Förbättringar

1. **Helper `withSaveStatus(options)`** i `useSaveStatus.ts` som lindar in `onMutate/onSuccess/onError` automatiskt — minskar boilerplate och säkrar att inget glöms:
   ```ts
   useMutation(withSaveStatus({ mutationFn, onSuccess: ... }))
   ```

2. **Dedupera felmeddelanden** — om flera autosaves failar samtidigt visa bara en toast (`toast.error(..., { id: "save-error" })`).

3. **`beforeunload`-skydd** — om `status === "saving"` när användaren försöker stänga fliken, visa webbläsarens "Är du säker?"-prompt så inga ändringar tappas.

4. **Klick-att-försöka-igen** — vid fel-status, gör indikatorn klickbar och invalidera/refetcha senaste mutation. Enkel variant: visa "Försök igen" som länk i toasten.

5. **Tillgänglighet** — indikatorn har redan `role="status" aria-live="polite"`, behåll. Lägg till `prefers-reduced-motion` så loader-spinnern inte snurrar för användare med rörelseaversion.

## Filer som ändras
- `src/hooks/useSaveStatus.ts` — lägg till `withSaveStatus` helper, deduperad error-toast, reduced-motion-flagga
- `src/components/Layout.tsx` — rendera global `<SaveStatusIndicator />` + `beforeunload`-listener
- `src/pages/CampaignDetails.tsx` — ta bort lokala indikatorn
- `src/hooks/useCampaigns.ts`, `useSequence.ts` — refaktorera till `withSaveStatus(...)`
- `src/hooks/useProfile.ts`, `useEmailAccounts.ts`, `useSendingLimits.ts` — koppla in `withSaveStatus(...)` på update-mutationerna

Inga DB- eller backendändringar.
