

## Step 6 — Page-by-Page QA & Fixes

### Current State
Most pages are already implemented with real data bindings, working forms, loading states, empty states, and toasts. After auditing every page and hook, here are the remaining fixes:

### Fixes Needed

**1. Dashboard lead count (Dashboard.tsx)**
The query `select("*, leads(count)")` returns `{ leads: [{ count: N }] }` but the template uses `(c as any).leads?.[0]?.count` which is fragile and may not work with the typed client. Fix the type cast to properly extract the count.

**2. CampaignDetails — delete lead support**
Currently leads can be added but not deleted. Add a delete button per row so users can remove incorrect leads before generating.

**3. CampaignDetails — "View emails" button visibility**
The "View emails" button only shows when `campaign.status === "generated"`. After generating, the campaign query needs to be invalidated so the button appears immediately without a page refresh. The `handleGenerate` function already invalidates `["campaign", id]` — verify this works correctly.

**4. Outreach — regenerate for follow-ups**
The regenerate button only appears on the Cold Email card. Add it to follow-up cards as well, or make it regenerate the full sequence (which the edge function already supports via `lead_id`).

**5. Settings — no edit profile functionality**
The settings page displays profile info read-only. Add an editable name field with save button.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Fix lead count type, remove `as any` |
| `src/pages/CampaignDetails.tsx` | Add delete lead button per row |
| `src/hooks/useLeads.ts` | Add `useDeleteLead` mutation |
| `src/pages/Outreach.tsx` | Add regenerate to all email cards |
| `src/pages/Settings.tsx` | Add editable name field with save |
| `src/hooks/useProfile.ts` | Add `useUpdateProfile` mutation |

### No Changes Needed
- `/campaign/new` — fully working with validation, limits, toasts
- `/login` and `/signup` — fully wired to auth
- Edge function — already uses AI gateway with structured output
- Usage limits — properly enforced across all pages

