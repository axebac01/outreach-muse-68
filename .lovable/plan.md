## Få stadskorten att följa globen när den snurrar

### Problem
Korten ("New York 87%" osv.) ligger på fasta skärmpositioner (`top-left`, `bottom-right` osv.) — de står stilla medan globen roterar. De är inte ankrade till sina städer.

### Lösning
Projicera varje stads `[lat, lon]` → 3D-punkt på enhetssfär → 2D-skärmkoordinater varje frame, med samma `phi` (rotation) och `theta` (lutning) som vi skickar till `globe.update()`. Då följer korten städerna exakt.

### Tekniska detaljer
1. **Matematik per frame** (i animations-loopen):
   - `lat → radianer`, `lon → radianer`
   - Justera longitud med aktuell `phi`: `adjLon = lon - phi - π/2`
   - 3D-punkt: `x = cos(lat)·cos(adjLon)`, `y = sin(lat)`, `z = cos(lat)·sin(adjLon)`
   - Applicera `theta`-tilt runt X-axeln på (y, z)
   - Synlig om `z > 0.05` (på framsidan av sfären)
   - Skärm-koord: `screenX = 0.5 + x·radius`, `screenY = 0.5 - y·radius` (radius ≈ 0.38 av container-bredden — empirisk passform till cobes synliga sfär)

2. **State-uppdatering**: `setProjected()` med array av `{ id, x, y, visible }` varannan frame (throttling, ~30 fps räcker för smidig anchoring utan att överbelasta React).

3. **Rendering**: Varje kort positioneras absolut med `left: x%`, `top: y%`, `transform: translate(-50%, calc(-100% - 10px))` så det sitter ovanför stadens punkt. `opacity: 0` när staden är på baksidan av globen, `opacity: 1` på framsidan, med 0.35s fade-transition.

4. **Liten prick-konnektor** under varje kort som markerar exakt stadsposition på globen.

5. **Behåller** drag-att-rotera, paus-vid-drag, alla nuvarande färger och stil.

### Filer som ändras
- `src/components/ui/globe-emails.tsx` — lägg till projicering + state, byt fasta positioner mot dynamiska.

### Verifiering
1. Globen roterar → korten glider med städerna i samma takt.
2. När en stad försvinner runt baksidan → kortet fadear ut. När den kommer fram igen → fadear in.
3. Drag med musen → korten följer direkt.
4. Inga märkbara hack/lag i animationen.
