

## Step 8 — UX + Polish

### Summary
Refine spacing, typography, card layouts, button hierarchy, and visual clarity across all pages to feel like a premium B2B SaaS product.

### Changes

**1. Global CSS (`src/index.css`)**
- Add subtle body gradient background (very light blue-to-white)
- Add `.card-hover` utility class with scale transform on hover
- Increase heading font weights: h1 gets `font-bold` with tighter tracking

**2. Landing page (`src/pages/Landing.tsx`)**
- Increase hero vertical padding (`py-24 md:py-40`)
- Make hero h1 larger on desktop (`md:text-7xl`) with tighter `leading-[1.05]`
- Add subtle animated gradient blob behind hero text
- Increase feature card padding and add `group` hover lift effect (`hover:-translate-y-1`)
- Make testimonial section more spacious with larger quote text
- Add `animate-fade-in` to hero elements with staggered delays

**3. Dashboard (`src/pages/Dashboard.tsx`)**
- Increase top padding to `py-12`
- Add page description with slightly larger text
- Campaign cards: increase padding to `p-6`, add `hover:-translate-y-0.5` transform
- Status badges: slightly larger with `px-2.5 py-1`
- Skeleton loaders: match updated card padding

**4. Campaign Details (`src/pages/CampaignDetails.tsx`)**
- Wrap the info grid cards in subtle gradient borders
- Add icons to each info card (Target, Package, Gift, MessageSquare)
- Increase section spacing between header, info grid, and leads table
- Style the "Generate Emails" button with the `hero` variant for prominence
- Add a subtle card wrapper around the leads table section

**5. Create Campaign (`src/pages/CreateCampaign.tsx`)**
- Wrap form in a card with border and padding
- Add step indicator or progress hint ("Step 1 of 2: Define your campaign")
- Increase spacing between form fields
- Make submit button use `hero` variant

**6. Outreach page (`src/pages/Outreach.tsx`)**
- Increase lead sidebar width to `w-64`
- Add a subtle border-right separator to the sidebar
- Improve lead button hover states with rounded corners and better spacing
- Add campaign name in the header breadcrumb style

**7. Email Card (`src/components/EmailCard.tsx`)**
- Add left border accent (2px primary color) for visual hierarchy
- Increase padding and add subtle background tint
- Make subject line stand out more with a badge-like styling

**8. Settings (`src/pages/Settings.tsx`)**
- Add usage progress bars (visual fill) instead of just text ratios
- Add subtle card hover effects

**9. Pricing (`src/pages/Pricing.tsx`)**
- Growth tier: add gradient background instead of plain border highlight
- Increase card padding and spacing
- Make "Most popular" badge more prominent
- Add money-back guarantee text under pricing

**10. Auth pages (`Login.tsx`, `Signup.tsx`)**
- Add a subtle card wrapper around the form
- Increase form spacing
- Add a thin primary-color top border on the card for brand accent

**11. Navbar (`src/components/Navbar.tsx`)**
- Add subtle bottom border shadow for depth
- Increase logo font size slightly
- In app mode: add a subtle divider between nav groups

### Files to Modify
| File | Changes |
|------|---------|
| `src/index.css` | Add utility classes, refine base styles |
| `src/pages/Landing.tsx` | Hero sizing, animations, feature card hover |
| `src/pages/Dashboard.tsx` | Card padding, hover transforms, spacing |
| `src/pages/CampaignDetails.tsx` | Info card icons, button hierarchy, table wrapper |
| `src/pages/CreateCampaign.tsx` | Card wrapper, hero button, step hint |
| `src/pages/Outreach.tsx` | Sidebar width, separator, breadcrumb |
| `src/components/EmailCard.tsx` | Left border accent, padding, subject styling |
| `src/pages/Settings.tsx` | Usage progress bars |
| `src/pages/Pricing.tsx` | Growth tier gradient, spacing, guarantee text |
| `src/pages/Login.tsx` | Card wrapper, top border accent |
| `src/pages/Signup.tsx` | Card wrapper, top border accent |
| `src/components/Navbar.tsx` | Border shadow, spacing |

### Technical Details
- All changes are CSS/Tailwind only, no new dependencies
- Uses existing `animate-fade-in` keyframe from tailwind config
- Progress bars use simple `div` with percentage width and `bg-primary` fill
- No functional logic changes, purely visual refinements

