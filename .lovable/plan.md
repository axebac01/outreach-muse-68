## Mål

Sluta kalla funktionen "Warm-up" eftersom vi inte gör riktig inbox-warmup. Använd istället "Ramp up" och förklara tydligt vad det faktiskt gör: en gradvis upptrappning av dagligt sändtak för nya konton.

## Vad som ändras (endast UI)

**`src/pages/EmailAccounts.tsx`**
- "Warm-up dag X/14" → "Ramp up dag X/14"
- Toggle-label "Warm-up" → "Ramp up"
- Lägg till en liten info-tooltip (ikon `Info` från lucide) bredvid toggle-labeln med texten:
  > "Ramp up trappar gradvis upp ditt dagliga sändtak under de första 14 dagarna för ett nytt konto (start 20/dag → upp till 50/dag). Det här är **inte** domän-/inbox-warmup — vi skickar inga interna mejl och påverkar inte din avsändarreputation."

**`src/hooks/useSendingLimits.ts`**
- Byt namn på returfältet `warmupDay` → `rampUpDay` i `effectiveCap()` (intern variabel, påverkar bara EmailAccounts.tsx).

## Vad som INTE ändras

- Databaskolumner (`warmup_enabled`, `warmup_started_at`) — lämnas orörda för att undvika migration. Bara visningsnamn ändras.
- Logik i `process-scheduled-sends` och `useSendingLimits` — ramp-funktionen finns redan och fungerar, det är bara namnet som var missvisande.
- Inga andra komponenter berörs.

## Tekniska detaljer

Två filer, ~10 raders ändring totalt. Ren UI-/namnändring utan funktionspåverkan.
