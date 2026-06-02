## Plan: Nordic Signal-tema + Aurora-hero

Du har bifogat ett komplett designpaket (HANDOFF.md, index.css, tailwind-snippet, AuroraHero.tsx, logo.svg). Eftersom appen redan bygger på shadcn-tokens räcker det att byta tokens + fonts + logo + lägga in hero-komponenten. Resten av appen byter "skinn" automatiskt.

### Vad jag ändrar

**1. `src/index.css`** — token-byte
- Byt Google Fonts-import: Inter → Schibsted Grotesk + Newsreader + JetBrains Mono.
- Ersätt `:root`-blocket och `.dark`-blocket med Nordic Signal-tokens (varmt papper i ljust, varmt ember-mörker i mörkt, ember/persimmon som `--primary`, pine `--success`, honey `--warning`).
- Behåll resten av filen (body-bakgrund, `.prose`, Tiptap-stilarna).

**2. `tailwind.config.ts`** — fonts + aurora-animationer
- `fontFamily.sans` → Schibsted Grotesk, plus `display`, `serif` (Newsreader), `mono` (JetBrains Mono).
- Lägg till keyframes `aurora-1/2/3` och `ping-soft` + matchande `animation`-entries vid sidan av befintliga.

**3. `src/assets/logo.svg`** — ersätt med den nya märket från zippen.

**4. `src/components/AuroraHero.tsx`** — ny komponent (drop-in från zippen, scoped CSS, alltid mörk).

**5. `src/pages/Landing.tsx`** — ersätt nuvarande `<section>`-hero (raderna 33–65, inkl. `PipelineMockup`) med `<AuroraHero />`. Resten av sidan (How it works, features, CTA) behålls — de plockar upp de nya tokens automatiskt.

**6. Navbar-ordmärke** — uppdatera till `Mail` + `Lead` (i `text-primary`) + `.ai` (i `text-muted-foreground`) enligt HANDOFF, så texten matchar nya logon.

### Vad jag INTE ändrar

- Inga DB-, edge function- eller logikändringar.
- Appen (inloggat läge) förblir i ljust läge som idag — bara hero-sektionen är alltid mörk (Aurora). Vill du ha hela appen mörk sätter vi `class="dark"` på `<html>` separat — säg till.
- `PipelineMockup` tas bort från landningssidan (Aurora-hero har egen visuell mockup). Komponenten ligger kvar i kodbasen och kan återanvändas senare om du vill.
- Övriga sidor (Dashboard, Leads, Campaign etc.) får automatiskt nya färger/typsnitt — ingen manuell genomgång krävs nu, men jag noterar i loopen om något ser brutet ut efter token-bytet.

### Risker

- Schibsted Grotesk har annan x-höjd än Inter → vissa knappar/badges kan se aningen tätare/glesare ut. Justeras vid behov efter visuell granskning.
- Aurora-hero har egna inline-CSS-värden (hex) som inte använder tokens — det är medvetet eftersom sektionen är alltid mörk och fristående.

Säg till om jag ska köra, eller om du vill ändra något (t.ex. behålla `PipelineMockup` under hero, eller göra hela appen mörk direkt).