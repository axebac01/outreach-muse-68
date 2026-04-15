

## SignalFlow Copy Update Plan

### Summary
Update all UI copy across the app to rebrand from "MailLead.ai" to "SignalFlow" with high-converting B2B SaaS messaging focused on outcomes.

### Files to Update

| File | Changes |
|------|---------|
| `index.html` | Update title, meta description, OG tags to SignalFlow branding |
| `src/components/Navbar.tsx` | Brand name: MailLead.ai → SignalFlow |
| `src/pages/Landing.tsx` | Hero headline, subheadline, tagline, features descriptions, footer, CTAs |
| `src/pages/Dashboard.tsx` | Title: "Campaigns" → "Your campaigns", CTA: "New Campaign" → "New campaign" |
| `src/pages/CreateCampaign.tsx` | Title: "Create Campaign" → "Create a new campaign", update subtext |
| `src/pages/CampaignDetails.tsx` | "Leads" section title → "Add leads", add upgrade message |
| `src/pages/Outreach.tsx` | Title → "Generated outreach", update subtext |
| `src/pages/Pricing.tsx` | Simplify to 2 tiers: Starter (Free), Growth (€99/month) with outcome-focused descriptions |
| `src/pages/Login.tsx` | Brand reference update |
| `src/pages/Signup.tsx` | Brand reference update, CTA: "Start free" |

### Key Copy Changes

**Landing Page:**
- Tagline: "Personalized outbound that actually gets replies."
- Headline: "Write personalized cold emails at scale."
- Subheadline: "SignalFlow helps founders and sales teams generate high-converting outreach for every lead — without spending hours researching and writing manually."
- Primary CTA: "Start free"

**Dashboard:**
- Title: "Your campaigns"
- CTA: "New campaign"

**Create Campaign:**
- Title: "Create a new campaign"
- Subtext: "Tell SignalFlow who you want to reach and what you're offering."

**Campaign Details (Leads):**
- Title: "Add leads"
- Subtext: "Enter lead details to generate more relevant outreach."

**Outreach:**
- Title: "Generated outreach"
- Subtext: "Review, copy, and refine your email sequences."

**Pricing:**
- Starter: Free (1 campaign, 10 leads, AI generation)
- Growth: €99/month (Unlimited campaigns/leads, priority support)
- Remove Scale tier

**Upgrade Message (to add where appropriate):**
"You've reached your free limit. Upgrade to keep generating outreach."

### Technical Notes
- All changes are copy-only; no structural or logic changes
- Tone: Clean, confident, B2B SaaS — focus on outcomes, not features
- Maintain existing component props and functionality

