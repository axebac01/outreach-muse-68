## Plan: Fixa interna länkar på startsidan (/)

### Problem
Komponenten `AuroraLanding.tsx` (som utgör hela `/`) har en egen navbar, CTA-knappar och footer där **alla länkar är döda**: antingen `<a href="#">` eller `<button>` utan navigation. Det betyder att Google inte kan följa länkarna till Priser, Legal-sidor, Login eller Signup — och besökare fastnar.

### Ändringar

1. **Navbar i AuroraLanding**
   - `Funktioner` → scroll till funktions-sektionen (lägger till `id="features"` på sektionen, länk blir `<a href="#features">`)
   - `Priser` → `<Link to="/pricing">`
   - `Kunder` → **tas bort** (finns ingen sida, bara ett enskilt quote)
   - `Logga in` → `<Link to="/login">` (ersätter `<button>`)
   - `Prova gratis` → `<Link to="/signup">` (ersätter `<button>`)

2. **Hero-CTA**
   - `Skapa ditt första mejl – gratis` → `<Link to="/signup">`
   - `Boka demo` → `mailto:`-länk till kontaktadress

3. **Pricing-kort**
   - Båda CTA-knapparna → `<Link to="/signup">` (”Kom igång” och ”Lås upp obegränsade utskick”)

4. **Footer**
   - `Integritet` → `<Link to="/legal/privacy">`
   - `Villkor` → `<Link to="/legal/terms">`
   - `Cookies` → `<Link to="/legal/cookies">`

5. **Avslutande CTA-sektion**
   - `Prova gratis – inget kreditkort` → `<Link to="/signup">`

### Tekniskt
Importerar `Link` från `react-router-dom`. Knappar som ska navigera byts till `<Link>` med samma Tailwind-klasser så styling behålls. Inga designändringar.

### Fil som ändras
- `src/components/AuroraLanding.tsx`