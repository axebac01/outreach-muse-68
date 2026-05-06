## Mål
Visa **alla besök** (inte bara matchade företag) på `/inbound` så du ser realtidsaktivitet — Stockholm-besökare, sidor som visas, referrer — även när IPinfo inte returnerar företagsnamn.

## Ändringar

### 1. Realtime på `visits`-tabellen
Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;` + `ALTER TABLE public.visits REPLICA IDENTITY FULL;`

### 2. `src/hooks/useInbound.ts`
Ny hook `useRecentVisits(limit = 50)`:
- Hämtar de 50 senaste besöken (alla, oavsett company_id)
- Lyssnar på Realtime INSERTs + refetch var 15:e sekund som fallback

### 3. `src/pages/Inbound.tsx`
Lägg till en tredje tab **"Live-besök"** vid sidan av "Alla företag" / "Kända leads":
- Lista med tidsstämpel (relativ), URL-path, stad/land, referrer, UTM
- Liten ikon: 🏢 om `company_id` finns, 👤 om anonym
- Auto-uppdaterar via Realtime
- Pulserande "Live"-indikator i headern

Behåll befintlig vy som default — Live-tab är ett komplement, inte en ersättning.

### 4. KPI-strip ovanför tabbarna
Tre små stat-kort:
- Besök idag
- Unika besökare idag  
- Identifierade företag idag

Detta gör det självklart att tracking funkar även om "företag"-listan är tom.

## Filer
- `supabase/migrations/<ts>_visits_realtime.sql` (ny)
- `src/hooks/useInbound.ts` (ny hook)
- `src/pages/Inbound.tsx` (Live-tab + KPI-strip)