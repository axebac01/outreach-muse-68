## Mål

Gör det tydligt om snippeten faktiskt är installerad och fungerar, så användaren slipper gissa.

## Vad vi bygger

### 1. Verifierings-status per sajt
Lägg till tre fält på `tracking_sites`:
- `last_ping_at` (timestamptz) — senaste gången snippeten hörde av sig
- `verified_at` (timestamptz) — första gången vi tog emot ett besök
- `last_ping_url` (text) — URL från senaste pingen (för att visa "vi såg dig på X")

`track-visit` uppdaterar dessa vid varje request.

### 2. Status-badge i UI
På `/settings/tracking` visas en tydlig statuspill per sajt:
- **"Inte installerad än"** (grå) — `verified_at` är null
- **"Aktiv"** (grön, pulserande prick) — ping inom senaste 24h
- **"Inaktiv"** (gul varning) — verifierad men ingen ping på >24h (snippet kanske borttagen)

Plus liten text: "Senast sedd: 2 min sedan på /pricing".

### 3. "Verifiera installation"-knapp
Knapp som öppnar en dialog som:
- Pollar databasen var 2:a sekund i upp till 60s
- Ber användaren öppna sin sajt i en ny flik
- När en ping kommer in: confetti + "Klart! Snippeten är installerad."
- Timeout efter 60s: visar felsökningstips (cache, fel domän, CSP, ad-blocker)

### 4. Onboarding-checklista i tom-state
När `verified_at` är null visas en kort 3-stegs guide direkt under snippeten:
1. Kopiera snippeten
2. Klistra in i `<head>` på din sajt
3. Besök sajten — vi upptäcker det automatiskt

### 5. Inbound-sidan: varning om ingen sajt verifierad
Om användaren har sajter men ingen är verifierad, visa en banner överst på `/inbound`: "Vi har inte tagit emot några besök än — verifiera installationen".

## Tekniska detaljer

**Migration:** lägg till `last_ping_at`, `verified_at`, `last_ping_url` på `tracking_sites`.

**Edge function `track-visit`:** efter att site-lookup lyckas, uppdatera `last_ping_at = now()`, sätt `verified_at = now()` om null, sätt `last_ping_url = url`. En extra UPDATE per request — försumbart.

**Realtime:** `tracking_sites` läggs till i `supabase_realtime`-publication så UI uppdateras direkt utan polling när ping kommer in.

**Verifierings-dialog:** subscribar på `postgres_changes` för rad-id, visar "väntar..." spinner, byter till success-state när `verified_at` blir satt.

**Statuspil-logik:**
```
verified_at IS NULL                          → "Inte installerad"
last_ping_at > now() - 24h                   → "Aktiv"
last_ping_at <= now() - 24h                  → "Inaktiv (kontrollera)"
```

## Filer

- Ny migration: `tracking_sites` + 3 kolumner + realtime
- `supabase/functions/track-visit/index.ts` — uppdatera ping-fält
- `src/hooks/useInbound.ts` — realtime-subscription för tracking_sites
- `src/pages/TrackingSettings.tsx` — status-badge, verifiera-knapp + dialog, onboarding-steg
- `src/pages/Inbound.tsx` — banner när ingen sajt är verifierad
