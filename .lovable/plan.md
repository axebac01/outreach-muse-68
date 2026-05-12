## Problem

On the Schedule tab, clicking "Idag", "Imorgon", "Nästa måndag" or picking a date in the calendar saves correctly to the database (verified: `PATCH /sequences` returns `204` with body `{"start_at":"..."}`), but the UI keeps showing "Välj datum" — making it look like nothing happens.

## Root cause

`CampaignDetails.tsx` reads the sequence via `useCampaignSequence(id)` which uses the React Query key `["campaign_sequence", campaignId]`.

`useUpdateSequence` (in `src/hooks/useSequence.ts`) only invalidates `["sequence", id]` and `["sequences"]` after a successful mutation. The `["campaign_sequence", ...]` cache is never invalidated, so `ScheduleTab` keeps receiving the stale `sequence` prop with `start_at = null`, and the button label / calendar selection never updates.

The same staleness affects every other field edited from the Schedule, Senders and other tabs (timezone, sending window, days, pause_on_reply, etc.) — they all persist but only appear after a hard reload.

## Fix

In `src/hooks/useUpdateSequence` (`src/hooks/useSequence.ts`), also invalidate the `campaign_sequence` query in `onSuccess`:

```ts
qc.invalidateQueries({ queryKey: ["sequence", id] });
qc.invalidateQueries({ queryKey: ["sequences"] });
qc.invalidateQueries({ queryKey: ["campaign_sequence"] });
```

That's the only change needed — one line in one file. After this, picking "Idag" or any date will immediately update the button label and calendar highlight.

## Out of scope

No DB, RLS, or component changes. The Calendar / Popover already work correctly; the bug is purely a stale React Query cache.
