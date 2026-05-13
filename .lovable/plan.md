## Mål
Visa autosave-bekräftelser som små toast-badges nere till höger, med tydligt namn på vad som sparades, utan att det blir spammigt.

## Approach

Byt ut den globala "Sparar/Sparat"-indikatorn i navbaren mot **sonner-toasts** positionerade `bottom-right`. Varje autosave-mutation taggas med en **etikett** ("Schema", "Sekvenssteg 1", "Profil"…) som visas i toasten.

### Anti-spam-strategi (viktigast)

1. **Stabilt toast-id per etikett** — `id: "save:<label>"`. När samma fält sparas flera gånger i rad uppdateras samma toast istället för att stapla nya.
2. **Loading → success-övergång** på samma id: medan debouncen pågår visas "Sparar …", som flippar till "Sparat: …" när skrivningen lyckas. Inga mellanliggande toasts.
3. **Kort `duration`** (1500 ms) på success-toasten så de försvinner snabbt.
4. **Ingen toast för triviala mutationer** som har egna explicita feedbacks (skapa kampanj, ta bort lead, skicka test etc.) — vi använder bara denna för **autosave-mutationer**.

## Implementation

### 1. `withSaveStatus` får `label`-argument
`src/hooks/useSaveStatus.ts`:
```ts
withSaveStatus({ label: "Schema", mutationFn, onSuccess })
```
Internt:
- `onMutate` → `toast.loading("Sparar " + label, { id: "save:" + label })`
- `onSuccess` → `toast.success("Sparat: " + label, { id: "save:" + label, duration: 1500 })`
- `onError` → `toast.error("Kunde inte spara " + label, { id: "save:" + label, description: err.message, duration: 5000 })`

Behåller pendingCount för `useUnsavedChangesGuard` (beforeunload-skydd).

### 2. Sätt etiketter per mutation
| Hook | label |
|---|---|
| `useUpdateCampaign` | "Kampanj" |
| `useUpdateSequence` | "Sekvensinställningar" |
| `useUpsertStep` | "Sekvenssteg" |
| `useToggleSender` | "Avsändare" |
| `useUpdateProfile` | "Profil" |
| `useUpdateEmailAccount` | "E-postkonto" |
| `useUpdateSendingLimit` | "Sändningsgränser" |

För mutationer där ett mer specifikt namn är värdefullt (sekvenssteg har t.ex. `step_order`), tillåts `label` vara en funktion av mutationens variabler:
```ts
withSaveStatus({ label: (vars) => `Sekvenssteg ${vars.step_order}`, ... })
```

### 3. Toaster-konfiguration
`src/App.tsx` — sätt `<Sonner position="bottom-right" />` (default är top-right för shadcn-mallen). Ingen annan styling behövs, sonner-toasterna använder redan design-tokens.

### 4. Ta bort navbar-indikatorn
`src/components/Navbar.tsx` — ta bort `<SaveStatusIndicator />` och importen. Komponentfilen kan ligga kvar oanvänd (ev. radera).

## Filer som ändras
- `src/hooks/useSaveStatus.ts` — `label`-stöd, byt indikator-store mot sonner-anrop, behåll beforeunload
- `src/App.tsx` — `position="bottom-right"` på `<Sonner />`
- `src/components/Navbar.tsx` — ta bort indikatorn
- `src/components/SaveStatusIndicator.tsx` — radera (oanvänd)
- `src/hooks/useCampaigns.ts`, `useSequence.ts`, `useProfile.ts`, `useEmailAccounts.ts`, `useSendingLimits.ts` — lägg till `label` i varje `withSaveStatus(...)`-anrop

Inga DB- eller backendändringar.
