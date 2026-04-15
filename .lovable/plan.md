

## Step 7 — QA Fix Pass

### Issues Found

1. **CampaignDetails: Duplicate "Notes" table header** — Line 161 has a second `<th>Notes</th>` that shouldn't exist. The table header has 8 columns but data rows only have 7 cells, causing misalignment.

2. **CampaignDetails: Add-lead row missing delete column** — The input row has 6 `<td>` elements but the table has 7 columns (after fixing #1). The Notes input and Add button are crammed into one cell. Need to split Notes into its own `<td>` and put the Add/Cancel buttons in the action column.

3. **CampaignDetails: Empty state colSpan wrong** — `colSpan={7}` but should match actual column count after fix.

4. **useCampaign uses `.single()`** — Should use `.maybeSingle()` per project guidelines to avoid errors when campaign not found.

5. **useProfile uses `.single()`** — Same issue. Should use `.maybeSingle()` to handle missing profiles gracefully.

6. **Regeneration double-counts usage** — The edge function always inserts `usage_tracking` rows, even on regeneration. This inflates the monthly outreach count. Should skip usage tracking when `lead_id` is provided (regeneration).

7. **Dashboard lead count type casting** — `((c as any).leads as any[])?.[0]?.count` works but is fragile. Can be cleaned up.

### Fixes

| File | Fix |
|------|-----|
| `src/pages/CampaignDetails.tsx` | Remove duplicate Notes header, fix add-row layout to 7 columns, add Cancel button, fix colSpan |
| `src/hooks/useCampaigns.ts` | Change `useCampaign` to use `.maybeSingle()` |
| `src/hooks/useProfile.ts` | Change `useProfile` to use `.maybeSingle()` |
| `supabase/functions/generate-outreach/index.ts` | Skip usage tracking when `lead_id` is set (regeneration) |
| `src/pages/Dashboard.tsx` | Clean up lead count extraction |

### No changes needed
- Landing, Pricing, Signup, Login — all functional
- Settings — working with edit name
- Outreach — regenerate wired to all cards
- CreateCampaign — validation, limits, toasts all working
- Edge function AI generation — structured output working
- Empty states and loading states — all present

