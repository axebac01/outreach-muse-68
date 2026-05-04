## Fixa globen så att kontinenter syns och den roterar

### Problem

1. **Kontinenter syns inte** — `cobe` ritar kontinenter som prickar via `mapSamples` + `mapBrightness`. Med `dark: 0` (ljus globe) och `baseColor: [1, 1, 1]` (vit) blir prickarna nästan osynliga eftersom `markerColor` används för prickarnas färg och vår markerColor är blå men `mapBrightness: 6` är för lågt. Vi måste höja brightness och säkerställa att prickarna har tillräcklig kontrast mot den vita basen.
2. **Globen roterar inte** — `onRender` skickas in som en option i `opts`, men `cobe`s API kräver att `onRender` ligger som **top-level option** och anropas varje frame av biblioteket självt. Vi sätter den korrekt, men `phi`-variabeln muteras inte eftersom vi även måste säkerställa att `requestAnimationFrame`-loopen inte krävs (cobe driver sin egen loop via `onRender`). Det fungerar — men problemet är att `state.phi` skrivs över med `phi + offsets`, och `phi` ökas bara inuti `onRender`. Det borde fungera. Den verkliga buggen är att canvas är osynlig (`opacity: 0` sätts till 1 efter 50ms — men om init misslyckas pga felaktig opts-typ kraschar `createGlobe` tyst).
3. **`arcs`-stöd** — `cobe` har **inte** inbyggt stöd för `arcs`. De måste ritas manuellt som SVG/canvas-overlay ovanpå globen, eller så hoppar vi över dem. Den ursprungliga snippeten använde sannolikt en annan globe-lib (t.ex. `three-globe` eller en custom variant).

### Lösning

1. **Förenkla `globe-emails.tsx`** så den använder `cobe` korrekt:
   - Ta bort `arcs`, `arcColor`, `arcWidth`, `arcHeight` från opts (stöds inte).
   - Höj `mapBrightness` till `6` och sätt `markerColor: [0.13, 0.45, 0.95]` så kontinent-prickarna blir tydligt blå mot vit bas.
   - Sätt `baseColor: [0.95, 0.97, 1]` (mjuk ljusblå) istället för helt vit — då syns globens silhuett bättre.
   - Sätt `glowColor: [0.6, 0.75, 1]` för en synlig blå halo.
   - Säkerställ att `onRender` är en top-level option (det är den, men typen `any` döljer fel) — verifiera att `phi` inkrementeras varje frame.
   - Behåll stadsmarkörer (de ritas av `cobe` via `markers`-arrayen) och drag-att-rotera.

2. **Lägg till bågar (arcs) som SVG-overlay** ovanpå canvasen:
   - Rita 4–6 mjuka kurvade SVG-paths mellan ungefärliga skärmpositioner (statiska, dekorativa) i primärblå med subtil pulse-animation.
   - Det matchar den ursprungliga visionen "mejl skickas mellan platser" utan att kräva 3D-projektion av lat/lon till skärmkoordinater.

3. **Behåll de flytande badges** ("1 240 mejl/min" etc.) — de fungerar redan.

### Filer som ändras

- `src/components/ui/globe-emails.tsx` — fixa cobe-opts, ta bort arcs från opts, lägg till SVG-overlay med dekorativa bågar.

### Verifiering

1. Besök `/` → globen syns med tydligt blå kontinent-prickar mot ljusblå bas.
2. Globen roterar långsamt automatiskt.
3. Dra med musen → globen följer, släpp → autorotation fortsätter.
4. SVG-bågar pulserar mjukt ovanpå.
5. Badges visar tickande siffror.
6. Inga konsolfel.
