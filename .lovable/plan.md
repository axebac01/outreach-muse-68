## Problem

Efter onboarding kraschar appen med tom skärm och felet:

```
Uncaught Error: cannot add `postgres_changes` callbacks for realtime:subscriptions:<user-id> after `subscribe()`
```

Kanalnamnet `subscriptions:<userId>` matchar `useSubscription.ts`. Samma buggmönster finns i `usePlanLimits.ts`.

## Orsak

Båda hookarna har detta mönster:

```ts
const query = useQuery(...);

useEffect(() => {
  const channel = supabase.channel(`subscriptions:${userId}`)
    .on("postgres_changes", ..., () => query.refetch())
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [userId, query]);   // ← query-objektet byter referens varje render
```

Två problem:
1. `query` är ny referens varje render → effekten river och bygger om kanalen hela tiden.
2. Supabase-klienten cachar kanaler per topic. När en ny effekt-cykel triggas innan föregående cleanup hunnit köra klart returnerar `.channel("subscriptions:<id>")` samma kanal-objekt som redan är i state `joined`. Då kastar `.on()` exakt det felet vi ser.

Efter onboarding mountas Dashboard som drar in både `useSubscription` och flera komponenter som triggar re-render snabbt → race uppstår och kraschar hela trädet (tom vit skärm).

## Plan

Två filer, samma fix.

### 1. `src/hooks/useSubscription.ts`

- Använd `useQueryClient().invalidateQueries(["subscription", userId, env])` istället för `query.refetch()`.
- Ta bort `query` från effekt-deps. Kvar blir `[userId, env, queryClient]` — alla stabila.
- Säkerhetsnät: ge kanalen unikt namn `subscriptions:${userId}:${env}` så `useSubscription` och `usePlanLimits` aldrig kan kollidera ifall någon framtida hook också lyssnar på `subscriptions`-tabellen.

### 2. `src/hooks/usePlanLimits.ts`

- Samma fix: byt `query.refetch()` mot `queryClient.invalidateQueries(["plan_limits", userId])`.
- Deps blir `[userId, queryClient]`.
- Kanalnamn `plan_limits:${userId}` är redan unikt.

### Verifiering

1. Logga ut → skapa nytt konto → kör hela onboardingen → landa på Dashboard utan tom skärm.
2. Kolla console — inga `cannot add postgres_changes` -fel.
3. Kontrollera att uppgradering/nedgradering av plan fortfarande triggar refetch (manuell sub-uppdatering via DB → UI ska ändras inom någon sekund).

## Inte i denna fix

- `useInbox.ts`, `useInbound.ts`, `useCreditBalance.ts` — använder redan `qc.invalidateQueries` + stabila deps. Lämnas orörda.
- Övriga punkter (1, 2, 3 från listan) tas i separata pass.
