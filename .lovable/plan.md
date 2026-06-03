## Plan: Uppdatera logo och favicon

Du har laddat upp nya filer direkt i chatten — jag använder dem istället för att vänta på GitHub-synk.

### Filer som byts/läggs till

**Logo (mörk, för ljus bakgrund — används i Navbar):**
- `src/assets/logo.svg` ← `maillead-mark.svg` (med mörk tile-bakgrund + orange "ember"-pil)

**Favicon-set (i `public/`):**
- `favicon.svg` ← uppladdad `favicon.svg` (32×32 med tile + ember)
- `favicon-32.png` ← uppladdad
- `favicon-16.png` ← uppladdad
- `apple-touch-icon.png` ← uppladdad
- Behåller inte den gamla `favicon.png` (ersätts av de nya storlekarna)

### Kod-ändringar

**`index.html`** — ersätt nuvarande favicon-rad med fullt set:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**Navbar/Footer**: Ingen ändring behövs — Navbar importerar redan `@/assets/logo.svg`. Footer använder ingen logo-bild.

### Inte med i denna ändring
- Den ljusa varianten `maillead-mark-light.svg` (för mörk bakgrund) — lägger inte till den eftersom inget i appen renderar logo på mörk bakgrund just nu. Säg till om du vill att jag förbereder den för framtida dark mode.
- Schibsted Grotesk-fonten för ordmärket är **redan importerad** i `src/index.css` och används av Navbar (`font-display`). Inget behöver göras där.
- `src/assets/maillead-logo.png` (gammal PNG) — lämnas orörd om den inte används; kan rensas senare om du vill.

### Verifiering
Efter ändringen kollar jag att Navbar fortfarande renderar och att `index.html` är ren.
