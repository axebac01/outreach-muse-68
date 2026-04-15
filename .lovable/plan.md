

## Steps 5-10: AI Generation, Full Implementation, QA, Polish & Conversion

### Summary
Replace placeholder email generation with real AI (Lovable AI Gateway), fix all data bindings, add a settings page, polish the UI, and optimize for conversion. One edge function handles all generation with structured output.

### Step 5 — AI Generation

**Update `supabase/functions/generate-outreach/index.ts`:**
- Replace placeholder string templates with calls to `https://ai.gateway.lovable.dev/v1/chat/completions`
- Use `LOVABLE_API_KEY` (already available) with model `google/gemini-3-flash-preview`
- Use tool calling to extract structured JSON with fields: `subject_line`, `opener`, `cold_email`, `follow_up_1`, `follow_up_2`
- System prompt enforces: short subject lines (<60 chars), emails under 120 words, no spammy language, no fake claims, personalized to lead data, optimized for reply rate
- Process each lead individually for better personalization
- Include campaign context (audience, product, offer, tone) in the prompt
- Handle 429/402 errors from the AI gateway gracefully
- Keep the existing usage tracking and campaign status update logic

### Step 6 — Page-by-Page Implementation

**Already working:** Dashboard, CreateCampaign, CampaignDetails (leads table + generate), Outreach (view/approve/copy), Login, Signup, Pricing, Landing.

**Fixes needed:**
- **Dashboard:** Lead count shows `0` — needs a proper count query or join
- **CampaignDetails:** After generating, auto-navigate or show "View emails" link more prominently; invalidate queries after generation
- **Outreach:** Wire the "Regenerate" button on `EmailCard` to actually call the edge function for a single lead
- **Settings page:** Create `/settings` route with profile info, plan display, and usage stats

**New files:**
- `src/pages/Settings.tsx` — shows profile name, email, current plan, usage stats, upgrade CTA

### Step 7 — QA Fix Pass

- Fix campaign card lead count (currently broken `(c as any).leads?.[0]?.count`)
- After outreach generation, invalidate both `["outreach"]` and campaign queries so status updates
- Ensure `canGenerateOutreach` properly checks monthly limit against actual usage
- Add error boundaries around main pages
- Ensure empty states show correctly when no data

### Step 8 — UX + Polish

- Improve card spacing and hover states on Dashboard
- Add subtle gradient to hero section background
- Better typography hierarchy: tighter line-height on headings
- Improve leads table responsiveness (horizontal scroll on mobile)
- Add transition animations on campaign cards
- Polish the outreach page lead sidebar with status indicators (pending/approved)
- Add skeleton loaders instead of just spinners

### Step 9 — Conversion Optimization

- Landing page: Add social proof section ("Trusted by 500+ sales teams")
- Stronger CTA copy on pricing page Growth tier
- Add comparison table under pricing (Starter vs Growth)
- Upgrade prompts: more specific value props ("Unlock unlimited campaigns and leads")
- Add testimonial/quote on signup page
- Sticky CTA on landing page for mobile

### Step 10 — AI Quality

- Refine system prompt: reference specific lead fields (company, role, LinkedIn insights)
- Add tone calibration per campaign (casual/professional/bold)
- Ensure opener references something specific about the lead's company
- Follow-ups should feel like a natural sequence, not repetitive
- Subject lines should avoid generic patterns like "Quick question" — aim for curiosity-driven, specific hooks

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/generate-outreach/index.ts` | Rewrite with Lovable AI Gateway |
| `src/pages/Settings.tsx` | New — profile, plan, usage |
| `src/App.tsx` | Add `/settings` route |
| `src/components/Navbar.tsx` | Add Settings link for logged-in users |
| `src/pages/Dashboard.tsx` | Fix lead count, add skeleton loaders |
| `src/pages/CampaignDetails.tsx` | Fix post-generation flow, query invalidation |
| `src/pages/Outreach.tsx` | Wire regenerate button |
| `src/components/EmailCard.tsx` | Accept onRegenerate callback |
| `src/pages/Landing.tsx` | Add social proof, mobile sticky CTA, gradient |
| `src/pages/Pricing.tsx` | Add comparison table, stronger CTAs |
| `src/pages/Signup.tsx` | Add testimonial quote |
| `src/index.css` | Minor polish: gradients, animations |
| `src/hooks/useCampaigns.ts` | Add lead count to campaign query |

### Technical Details

- AI model: `google/gemini-3-flash-preview` via Lovable AI Gateway
- Structured output via tool calling (not JSON mode) for reliable parsing
- Each lead processed individually to maximize personalization quality
- Edge function keeps CORS headers, auth validation, and usage tracking
- No new database tables needed
- Deploy edge function after rewrite

