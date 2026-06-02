## Plan: Applicera "Nordic Signal" Aurora-landning + light/dark-tema

Zipens tokens, fonts, aurora-animationer och logo är **redan på plats** i projektet sedan tidigare iterationer. Det enda som faktiskt är nytt är `AuroraLanding.tsx` och `next-themes`-wrappern.

### Ändringar

**1. `src/components/AuroraLanding.tsx` (NY)**
- Kopiera filen 1:1 från zipen (447 rader). Temadriven landningssida som funkar i både ljust och mörkt läge via `useTheme()` från `next-themes`. Innehåller egen sun/moon-toggle, hero med typewriter-effekt, leads-tabell, steps, features, FAQ och CTA.

**2. `src/pages/Landing.tsx` (ERSÄTT innehåll)**
```tsx
import AuroraLanding from "@/components/AuroraLanding";
const Landing = () => <AuroraLanding />;
export default Landing;
```
Tar bort nuvarande Layout/Navbar/Footer-wrappers på `/` — AuroraLanding är fristående med egen header och footer. Övriga sidor (login, signup, app) påverkas inte.

**3. `src/App.tsx` — wrappa i `ThemeProvider`**
```tsx
import { ThemeProvider } from "next-themes";
// ...
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryClientProvider ...>...</QueryClientProvider>
</ThemeProvider>
```
`next-themes` ^0.3.0 finns redan i `package.json`, ingen install behövs.

### Skippas (redan på plats — verifierat)

- `src/index.css` — `:root` + `.dark` Nordic Signal-tokens redan applicerade. Endast skillnad: nuvarande fil har även `--info` / `--sidebar-*` tokens som zipen saknar. **Behåller dessa** eftersom shadcn sidebar och tidigare token-städning beror på dem. Tar inte bort något.
- `tailwind.config.ts` — Schibsted Grotesk / Newsreader / JetBrains Mono + aurora-1/2/3 + ping-soft keyframes/animations är redan inlagda.
- `src/assets/logo.svg` — identisk med zipens version.
- Google Fonts `@import` — redan högst upp i `index.css`.

### Risker

- AuroraLanding har egen header med theme-toggle. Befintlig `Navbar` används bara på app-sidor (Login/Signup/Dashboard etc), så ingen dubblering på `/`.
- App-sidor (Dashboard, Inbox, Leads...) ärver nu också tema-toggleläget via `<html class="dark">`. De plockar upp tokens automatiskt — fungerar redan eftersom token-städning gjordes i Step A. Användaren kan dock inte byta tema inifrån appen ännu (toggle finns bara på landningen). Säg till om du vill att jag lägger en toggle även i app-navbaren — annars hoppar jag det.
- `defaultTheme="system"` betyder att första besöket följer OS-inställning. Säg till om du hellre vill ha `defaultTheme="light"`.

### Vad jag INTE rör

Ingen DB, inga edge functions, ingen logik, inga andra sidor/komponenter.