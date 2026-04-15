

## Step 9 — Conversion Optimization

### Summary
Sharpen copy, CTAs, and visual hierarchy across landing, pricing, upgrade prompts, and in-app nudges to maximize free-to-paid conversion.

### Changes

**1. Landing page (`src/pages/Landing.tsx`)**
- Hero headline: change to outcome-focused copy: "Book more meetings with AI-written cold emails" with "book more meetings" as the primary span
- Hero subheading: shorten and add specificity: "Generate personalized cold emails and follow-ups for every lead in seconds. No templates. No research. Just hit send."
- Primary CTA: "Start free" → "Generate your first email — free" (more specific, lower friction)
- Add "No credit card · Free forever up to 10 leads" under CTA (specificity reduces anxiety)
- Social proof: reword labels to be benefit-oriented: "Sales teams using MailLead" → "Active teams", "Emails generated" → "Outreach emails sent", "More replies" → "Avg. reply rate lift"
- Features section heading: "Everything you need to book more meetings" → "From lead list to booked meeting in 3 steps" (process-oriented)
- Add a "How it works" 3-step section between social proof and features: (1) Add your leads, (2) Generate personalized emails, (3) Copy, send, close
- Bottom CTA: "Ready to send outreach that converts?" → "Your competitors are already personalizing. Are you?" (urgency)
- Second testimonial quote added for credibility

**2. Pricing page (`src/pages/Pricing.tsx`)**
- Starter description: "For founders testing the waters" → "Try it free — no credit card needed"
- Growth description: "For teams scaling outbound" → "For teams serious about pipeline"
- Add ROI calculator line under Growth price: "That's less than one sales rep's hourly cost"
- Growth features: add "Export to CSV (coming soon)" to hint at roadmap
- Starter CTA: "Start free" → "Start generating — it's free"
- Growth CTA: "Upgrade to Growth" → "Unlock unlimited outreach"
- Add FAQ section below comparison table with 3-4 common objections (Can I cancel? What happens when I hit the limit? Do you store my leads?)
- Move guarantee badge higher, right under the pricing cards

**3. Upgrade banner (`src/components/UpgradeBanner.tsx`)**
- Change tone from warning/destructive to opportunity/primary: swap `border-destructive` to `border-primary`, `bg-destructive/5` to `bg-primary/5`, icon from `AlertTriangle` to `Rocket`
- Add a specific benefit line: "Unlock unlimited campaigns, leads, and AI generations"
- Button text: "Upgrade" → "See plans"

**4. Dashboard upgrade nudge (`src/pages/Dashboard.tsx`)**
- When campaign limit is reached, show a more persuasive message: "You've used your free campaign. Upgrade to create unlimited campaigns and scale your outreach."
- When generation limit is reached, make the message outcome-focused

**5. Navbar CTA (`src/components/Navbar.tsx`)**
- Landing page CTA button: "Start free" → "Try free" (shorter, punchier)
- Add subtle "Free" badge next to the CTA on landing nav

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Hero copy, CTA wording, how-it-works section, second testimonial, urgency CTA |
| `src/pages/Pricing.tsx` | Tier descriptions, CTA labels, ROI line, FAQ section, guarantee placement |
| `src/components/UpgradeBanner.tsx` | Positive tone, benefit text, icon swap |
| `src/pages/Dashboard.tsx` | Better upgrade messages |
| `src/components/Navbar.tsx` | Shorter CTA label |

### Technical Details
- All changes are copy/CSS only, no new dependencies or logic
- FAQ uses simple accordion or static list (no state needed)
- "How it works" section uses 3 numbered cards with icons
- No functional changes to hooks or data layer

