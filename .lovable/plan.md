

## Improve AI Output Quality

### Summary
Rewrite the system prompt, user prompt, and tool descriptions in the `generate-outreach` edge function to produce stronger personalization, more natural language, and clearer business value. No structural or logic changes — only prompt engineering.

### Changes (single file: `supabase/functions/generate-outreach/index.ts`)

**1. System Prompt — complete rewrite**
- Add explicit anti-patterns with examples of bad vs good writing
- Add rules for personalization depth: reference the lead's role, company stage, or industry — not just their name
- Require the cold email to connect the product to a specific pain point the lead likely has based on their role/company
- Ban filler phrases: "reaching out", "I wanted to", "I'd love to", "just following up", "checking in", "touch base"
- Require each follow-up to add a new insight or angle, never repeat the first email's pitch
- Set a "write like a busy founder texting a peer" tone benchmark
- Add instruction: open with an observation, not a self-introduction

**2. User Prompt — richer context injection**
- When `lead.notes` exists, instruct the model to use it as the primary personalization hook
- When `lead.website` exists, tell the model to reference what the company does based on the URL
- When `lead.role` exists, frame the value prop around that role's daily pain points
- Add explicit instruction: "Do NOT mention the lead's name more than once per email"
- Add: "The cold email should make the reader think 'this person actually looked at my company'"

**3. Tool Parameter Descriptions — tighter constraints**
- `subject_line`: "Specific to the lead's company or role. No generic hooks. Under 50 chars."
- `opener`: "One sentence that proves you researched this person. Reference their company, role, or a specific detail from notes."
- `cold_email`: "Under 100 words. Lead with an observation about their business, connect to a specific problem your product solves, end with a low-friction CTA (not 'jump on a call')."
- `follow_up_1`: "Under 70 words. New angle — share a relevant result, stat, or case study. Don't repeat the first email."
- `follow_up_2`: "Under 50 words. Breakup email. Friendly, zero pressure, leave the door open."

**4. Model upgrade**
- Switch from `google/gemini-3-flash-preview` to `google/gemini-2.5-flash` for better instruction following on nuanced copy tasks

### What stays the same
- All server logic, auth, CORS, error handling, usage tracking, DB operations
- Tool calling structure (function calling with structured output)
- Fallback templates for failed generations

