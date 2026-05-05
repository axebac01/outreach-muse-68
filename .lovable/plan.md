# Ny navigation + Analys-dashboard

## 1. Navigation (`src/components/Navbar.tsx`)
Ersätt nuvarande inloggat-läge-länkar:

- **Kampanjer** → `/dashboard` (befintlig sida; "Ny kampanj"-knappen finns redan inne på den sidan)
- **Mejlkonton** → `/email-accounts`
- **Analys** → `/analytics` (ny)

Ta bort `Ny kampanj`-knappen ur navbaren. Behåll Settings-ikon, språkväljare och Logga ut. Lägg `analytics` i `isApp`-prefix-listan.

## 2. i18n
Lägg till i `nav`-blocket i `sv.json` och `en.json`:
- `campaigns`: "Kampanjer" / "Campaigns"
- `analytics`: "Analys" / "Analytics"

Lägg till nytt `analytics`-block med strängar för titlar, statkort och tomstate (se nedan).

## 3. Ny sida: `/analytics` (`src/pages/Analytics.tsx`)
Registrera i `src/App.tsx` som skyddad route (`<ProtectedRoute>`).

### Datakälla
Aggregera klientside från befintliga tabeller via Supabase-klienten — ingen ny tabell behövs.

- `scheduled_sends` (filtrerat på `user_id` via RLS): grupperat på `status` ger `pending`, `sent`, `failed`, `skipped` osv.
- `sequence_leads`: grupperat på `status` ger leads-state (`active`, `replied`, `bounced`, `unsubscribed`, `done`).
- `sequences`: räkna `active` vs övriga.
- `unsubscribes`: total per användare.

Allt hämtas i en `useAnalytics()`-hook (`src/hooks/useAnalytics.ts`) som kör 4 parallella selects och returnerar sammanslagna siffror. Använd `select('status', { count: 'exact', head: true })` per status för exakta tal när data växer; för MVP räcker att hämta `select('status, sequence_id, created_at')` och aggregera i JS.

### Layout
Container med titel "Analys" + underrubrik "Sammanfattning från alla kampanjer".

**Tidsperiod-filter** (chip-knappar): 24h / 7d / 30d / Allt — default 7d. Filtrerar på `created_at`.

**KPI-rad (4 kort)**, semantiska tokens (`bg-card`, `text-primary`, `text-success`, `text-destructive`, `text-muted-foreground`):
1. **Skickade** — `count(scheduled_sends where status='sent')` med liten delta vs föregående period.
2. **Svar** — `count(sequence_leads where status='replied')` + svarsfrekvens (svar / skickade).
3. **Studsade / misslyckade** — `count(scheduled_sends where status in ('failed','bounced'))`.
4. **Avregistreringar** — `count(unsubscribes)`.

**Andra raden (3 kort):**
- Aktiva sekvenser (`sequences where status='active'`) / totalt
- Schemalagda kommande sändningar (`scheduled_sends where status='pending' and scheduled_for >= now()`)
- Totalt antal leads i sekvenser

**Diagram (recharts, redan installerat):**
- *Aktivitet över tid* — `<AreaChart>` med två serier (Skickade, Svar) per dag inom vald period. Pivotera `scheduled_sends.created_at`/`status='sent'` och `sequence_leads.created_at`/`status='replied'` per dag i JS.
- *Topp 5 kampanjer* — `<BarChart>` horisontell, sorterat på antal skickade. Joina via `sequence_id` → `sequences.name`.

**Tabell – Senaste aktivitet** (sista 10 raderna): tid, kampanj, lead-mejl, status-badge (färgkodad: skickat=success, svar=primary, fel=destructive). Hämtas via `scheduled_sends` med `select('*, sequence:sequences(name), lead:sequence_leads(email)')` ordered by `created_at desc limit 10`.

### Tomstate
Om inga `scheduled_sends` finns: visa centrerat `<EmptyState>` "Ingen data ännu — starta en kampanj för att se siffror här" med CTA till `/dashboard`.

### Stil
Återanvänd befintlig "card-hover" / `rounded-xl border bg-card p-6` mönstret från Dashboard. Inga nya färger — endast semantiska tokens. Skelett-loading med pulserande `bg-muted`-block i 200ms-skugga, samma stil som Dashboard.

## Filer som ändras
- `src/components/Navbar.tsx` — länkar
- `src/App.tsx` — ny route
- `src/i18n/locales/sv.json`, `src/i18n/locales/en.json` — nav + analytics-strängar
- `src/hooks/useAnalytics.ts` — ny hook
- `src/pages/Analytics.tsx` — ny sida

## Inte med nu
- Per-kampanj djupanalys (finns redan på kampanjsidan)
- Open/click-tracking (finns inte i datamodellen ännu)
- Export till CSV
