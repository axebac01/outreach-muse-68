# Replace globe with animated pipeline mockup

## Overview
Remove the `GlobeEmails` animation from the landing hero and replace it with a new animated dashboard mockup card that shows a live "Leads → Sequence → Replies" pipeline, matching the existing light design system.

## Files to change

### 1. New component: `src/components/ui/pipeline-mockup.tsx`
A self-contained client component (no extra deps — pure React + Tailwind + inline SVG/CSS keyframes). Structure:

```text
┌──────────────────────────────────────────────────────────┐
│  Leads (12)        Sekvens             Svar              │
│  ┌─────────┐  ···  ┌──────────────┐ ··· ┌──────────────┐ │
│  │ avatar  │       │ ● Dag 1      │     │ reply card   │ │
│  │ name    │       │ ● Dag 3      │     │ reply card   │ │
│  │ company │       │ ◐ Dag 7      │     │ reply card   │ │
│  └─────────┘       └──────────────┘     └──────────────┘ │
├──────────────────────────────────────────────────────────┤
│ 12 847 Skickade · 71.2% Öppningsgrad · 14.8% Svarsfrek.  │
└──────────────────────────────────────────────────────────┘
```

**Wrapper card:** `max-w-[880px]` centered, `bg-white`, `rounded-[16px]`, `border border-black/[0.08]`, `shadow-[0_2px_24px_rgba(0,0,0,0.06)]`, padding `p-6`. Fades in 400ms after mount via `animate-fade-in` with `animation-delay: 400ms`.

**Grid:** 3 columns on `md+`, stacked on mobile. The two SVG particle paths are absolutely positioned overlays sitting between columns (hidden on mobile).

**Column 1 — Leads:**
- Header row: "Leads" + small rounded badge showing live count.
- A pool of ~10 Swedish-named leads (Anna Lindqvist / Spotify / VD, Erik Johansson / Klarna / Grundare, etc.) with deterministic initials and tag colors.
- Renders the last 5; uses a `setInterval` (2500ms) that shifts the array. New row gets `data-state="enter"` with keyframe `slideInUp` (translateY 12→0, opacity 0→1, 500ms `cubic-bezier(0.16,1,0.3,1)`). Outgoing top row gets `fadeOut` 300ms.
- Active newest row: `border-l-2 border-primary/40 pl-2`.
- Avatar: `h-8 w-8 rounded-full bg-[#2563eb] text-white text-xs font-semibold grid place-items-center`.
- Role pill: `text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600`.

**Column 2 — Sekvens:**
- Static 3 step cards inside a sub-card. Each row: status dot (`h-2 w-2 rounded-full`) + title + small subtitle.
  - Dag 1 – Första mejlet · green `#16a34a` · "Skickat"
  - Dag 3 – Uppföljning · green · "Skickat"
  - Dag 7 – Sista chansen · amber `#d97706` · "Schemalagd"
- Subtle pulse on the amber dot (`animate-pulse`).

**Column 3 — Svar:**
- Pool of ~6 reply snippets in Swedish ("Ja, absolut — när passar det?", "Intressant, kan du skicka mer info?", "Vi tar ett möte nästa vecka.", "Tack, hör av mig på fredag.", "Låter spännande, vad kostar det?", "Skicka gärna en kalenderinbjudan.").
- `setInterval` (3500ms) prepends a new card with `slideInDown` (translateY -12→0). Cap at 3 visible; the 4th gets `fadeOut` then removed.
- Card: white bg, `border border-black/[0.08]`, `border-l-2 border-l-[#16a34a]/50`, `rounded-[10px]`, padding `p-3`. Contains avatar, name, snippet (truncated), timestamp ("nu", "2 min", "5 min"), and a green badge `text-[10px] bg-green-50 text-green-700 rounded px-1.5 py-0.5` reading "Svarade ↩".

**Particle paths (between columns):**
- Two absolutely-positioned `<svg>` overlays (`pointer-events-none`), each with a hidden cubic Bézier `<path id="p1">` / `<path id="p2">`.
- Inside the SVG, 3 staggered `<circle r="2.5" fill="#2563eb" filter="url(#glow)">` elements, each with `<animateMotion dur="1.5s" repeatCount="indefinite" begin="0s|0.5s|1s" rotate="auto"><mpath href="#p1"/></animateMotion>`.
- A `<filter id="glow">` with `feGaussianBlur stdDeviation="2"` + merge gives the soft blue glow.
- Path 1 curves from the right edge of column 1 (top-mid) into the left edge of column 2; path 2 mirrors from column 2 to column 3.

**Bottom stats strip:**
- `mt-6 pt-4 border-t border-black/[0.06]`, `grid grid-cols-3`.
- Each stat: large bold number on top (`text-xl md:text-2xl font-bold tracking-tight text-[#0f172a]`), label below (`text-xs text-[#64748b]`).
- Targets: 12 847 / 71.2 / 14.8.
- Custom hook `useCountUp(target, durationMs)` using `requestAnimationFrame` and an `easeOut` (`1 - Math.pow(1 - t, 3)`); supports decimals (1 dp) and Swedish thousand separator (`Intl.NumberFormat('sv-SE')`). Triggered on mount once.

**Cleanup:** All intervals + RAF are cleared on unmount. `prefers-reduced-motion: reduce` short-circuits the intervals so the static last frame is shown.

**i18n:** Strings ("Leads", "Sekvens", "Svar", "Skickade", "Öppningsgrad", "Svarsfrekvens", "Skickat", "Schemalagd", step titles, replies) added under `landing.pipeline.*` in both `sv.json` and `en.json`. Reply snippets and lead names live in those locale files as arrays so English users see English equivalents.

### 2. `src/pages/Landing.tsx`
- Remove `import { GlobeEmails } from "@/components/ui/globe-emails"`.
- Replace the `<div className="mx-auto mt-12 w-full max-w-lg md:max-w-xl"> <GlobeEmails/> </div>` block with `<div className="mx-auto mt-12 w-full max-w-[880px]"><PipelineMockup/></div>`.
- Add `import { PipelineMockup } from "@/components/ui/pipeline-mockup";`.

### 3. `src/components/ui/globe-emails.tsx`
- Delete the file (no other importers — verified by ripgrep before deletion).

### 4. `src/i18n/locales/{sv,en}.json`
- Add the `landing.pipeline` block. Remove the now-unused `landing.globeCaption` key.

## Design tokens used
- Blue `#2563eb` (matches existing `--primary` usage in light mode), green `#16a34a`, amber `#d97706`, text `#0f172a`/`#64748b`. Hardcoded as hex on this component for a pixel-exact match to the spec; no theme-token churn.
- Card radius 16px outer, 10px inner; border `rgba(0,0,0,0.08)`; shadow `0 2px 24px rgba(0,0,0,0.06)`.

## Animation summary
- Card mount: fade + translateY(16→0), 500ms `cubic-bezier(0.16,1,0.3,1)`, 400ms delay.
- Lead rows in: slideInUp 500ms; out: fadeOut 300ms; interval 2500ms.
- Reply cards in: slideInDown 500ms; out: fadeOut 400ms; interval 3500ms.
- Particles: SVG `animateMotion` 1.5s loop, 3 dots staggered per path, blue glow via SVG filter.
- Stats: 2s easeOut count-up on mount.
- Honors `prefers-reduced-motion`.

## Out of scope
- No new npm dependencies (no framer-motion). All animation is CSS keyframes + SVG `animateMotion` + a tiny RAF count-up hook.
- No changes to dark-mode styles (component is designed for the light landing page only; uses explicit hex).
