

## CSV/Excel Lead Import

### Goal
Let users bulk-upload leads from a CSV or Excel file on the Campaign Details page instead of adding them one-by-one.

### UX Flow
1. On `/campaign/:id`, add an **"Import file"** button next to "Add Lead".
2. Click opens a dialog: file picker (.csv, .xlsx, .xls) + a preview table of parsed rows with column mapping.
3. User confirms → leads are bulk-inserted into Supabase, respecting the plan's lead limit.
4. Toast shows how many were imported (and how many were skipped if the limit was hit).

### Parsing
- Use **`papaparse`** for CSV and **`xlsx`** (SheetJS) for Excel.
- Auto-detect columns by header name (case-insensitive): `name`/`full_name`, `email`, `company`, `role`/`title`, `website`, `linkedin`/`linkedin_url`, `notes`.
- Email is the only required field per row (since the user specifically mentioned email addresses). If `name` is missing, fall back to the email's local part.
- Skip empty rows. Show a row count and the first 5 rows as preview.

### Schema Change
The `leads` table currently has no `email` column. Add it:
```
ALTER TABLE leads ADD COLUMN email text;
```
No NOT NULL constraint (existing leads have no email). Update the lead table UI to display the email column and update `useCreateLead` + the manual add-lead row to accept it.

### Limit Enforcement
Before insert, compute `available = maxLeads - currentLeadCount`. If parsed rows exceed it, import only the first `available` rows and toast: *"Imported X of Y leads. Upgrade to import the rest."*

### Files to Modify / Create
| File | Change |
|------|--------|
| `supabase/migrations/...` | Add `email` column to `leads` |
| `src/components/ImportLeadsDialog.tsx` | **New** — file picker, parse, preview, confirm |
| `src/lib/parseLeadsFile.ts` | **New** — CSV/XLSX → normalized lead rows |
| `src/hooks/useLeads.ts` | Add `useBulkCreateLeads` mutation; include `email` in `useCreateLead` |
| `src/pages/CampaignDetails.tsx` | Add "Import file" button, mount dialog, add Email column to table + add-row |
| `package.json` | Add `papaparse`, `@types/papaparse`, `xlsx` |

### Technical Notes
- Bulk insert uses a single `supabase.from("leads").insert([...])` call with `user_id` and `campaign_id` stamped on each row.
- All parsing happens client-side — no edge function needed.
- File size cap: 2 MB (sane default for lead lists).
- After successful import, invalidate `["leads", campaignId]` and `["campaigns"]` queries.

