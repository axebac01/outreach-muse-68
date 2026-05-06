## Vad vi redan har
- ✅ **Vilka sidor:** varje sidladdning loggas i `visits` med `url`, `path`
- ✅ **Hur de kom hit:** `referrer`, `utm_source`, `utm_medium`, `utm_campaign` finns redan
- ❌ **Tid på sida / session:** loggas inte

## Vad som behöver byggas

### 1. Tid på sida (per pageview)
**Snippet (`tracker-script`):**
- Mät tid mellan pageload och `pagehide`/`visibilitychange=hidden`
- Skicka en uppföljnings-beacon med `{ visit_id, duration_ms, scroll_depth }`
- Heartbeat var 15s för att hantera långa sessioner som stängs hårt (browser crash)

**Server (`track-visit`):**
- Returnera `visit_id` (UUID) i POST-svaret så snippeten kan referera till den
- Ny endpoint-läge: om `visit_id` + `duration_ms` skickas → uppdatera befintlig visit istället för att skapa ny

**DB-migration:**
- `visits.duration_ms` (int, nullable)
- `visits.scroll_depth` (int, nullable, 0-100)
- `visits.ended_at` (timestamptz, nullable)

### 2. Session-aggregering
En "session" = besök från samma `visitor_id` med <30 min mellan pageviews.
Lägg till på `visits`:
- `session_id` (text) — beräknas i `track-visit` genom att titta på senaste visit för visitor_id
- Sessionens första referrer = sessionens "source"

### 3. UI-uppdateringar

**`/inbound` Live-flik:**
- Visa tid på sida bredvid varje rad: "23s", "2m 14s"
- Gruppera sessions visuellt (samma visitor + nära i tid → samma "kort")

**Drawer (företagsvyn):**
- "Sessioner" istället för platt visit-lista
- Per session: total tid, antal sidor, entry page, source/referrer
- Expanderbar för att se enskilda sidor och tid per sida

**KPI-strip:**
- Lägg till "Snitt-tid på sajt idag"

## Filer
- `supabase/migrations/<ts>_visit_duration.sql` (nya kolumner)
- `supabase/functions/track-visit/index.ts` (returnera visit_id, hantera duration-uppdateringar, session_id-logik)
- `supabase/functions/tracker-script/index.ts` (duration tracking + heartbeat + scroll depth)
- `src/hooks/useInbound.ts` (uppdatera typer, ny session-aggregering)
- `src/pages/Inbound.tsx` (visa duration + sessions)

## Att tänka på
- **Privacy:** scroll-depth och tid är inte personuppgifter, ingen extra consent behövs
- **Bandbredd:** beacon vid pagehide är gratis, heartbeat var 15s är försumbart
- **Pålitlighet:** `pagehide` triggas inte alltid → kombinera med `visibilitychange` + sista heartbeat som fallback