# GDPR-härdning av tracking-skriptet

Mål: göra MailLeads tracking cookieless och samtyckesfri by default, så sajtägare kan installera snippeten utan cookie-banner och utan att bryta mot ePrivacy/GDPR.

## 1. Cookieless visitor-ID (snippet)
- Ta bort `ml_vid`-cookien.
- Generera `visitor_id` som en daglig hash: `sha256(site_key + anonIp_hint + UA + YYYY-MM-DD)` beräknad i edge-funktionen istället för i klienten (klienten skickar bara en slumpad `client_seed` i `sessionStorage` som rensas vid tabbstängning).
- `session_id` ligger kvar i `sessionStorage` (rensas vid tabbstängning, ePrivacy tillåter detta som "strictly necessary").
- Effekt: ingen persistent identifierare → ingen cookie-banner krävs.

## 2. Default = privacy-safe
- Vänd default på `tracking_sites.require_consent` till `true` för nya sajter (kolumn-default ändras).
- Snippet beter sig så här:
  - Om `data-consent="granted"` finns på script-taggen ELLER `MailLead.consent()` anropats → tracka.
  - Annars → vänta tyst. Ingen request skickas.
- Sajtägare som vill köra utan consent måste explicit sätta `data-consent="granted"` (på eget juridiskt ansvar, t.ex. om de har LIA).

## 3. Respektera DNT och GPC
- I snippet: om `navigator.doNotTrack === '1'` eller `navigator.globalPrivacyControl === true` → returnera direkt, skicka ingenting.

## 4. Retention (auto-radering)
- Ny edge-funktion `purge-old-visits` (cron, dagligen 03:00 UTC):
  - Radera rader i `visits` äldre än 90 dagar.
  - Radera rader i `visitors` med `last_seen_at` äldre än 180 dagar.
  - Radera `inbound_companies` utan besök senaste 365 dagar.
- Schemaläggs via `pg_cron` + `pg_net` (separat insert-SQL, inte migration, eftersom URL/anon-key är projektspecifika).

## 5. "Glöm mig"-endpoint
- Ny edge-funktion `forget-visitor` (publik POST):
  - Body: `{ site_key, visitor_id }`.
  - Raderar alla `visits` och `visitors` för den kombinationen.
- Lägg till en `MailLead.forget()`-metod i snippet som anropar endpointen och tömmer `sessionStorage`.

## 6. UI på `/tracking-settings`
- Ny sektion "GDPR & integritet" med:
  - Toggle: "Kräv samtycke innan tracking" (default på).
  - Färdig privacy-policy-text på svenska/engelska att kopiera till sajtens policy (lista underbiträden: Lovable Cloud / Supabase EU, IPinfo).
  - Kort förklaring av cookieless-läget och `MailLead.consent()` / `MailLead.forget()`.
- Ny sektion "Datalagring": "Besöksdata raderas automatiskt efter 90 dagar."

## 7. IPinfo-anrop endast vid behov
- I `track-visit`: hoppa över IPinfo-uppslag om `require_consent=true` och consent inte är bekräftat (snippet skickar `consent: true/false`).
- Räcker eftersom snippet redan inte ens skickar request utan consent — men dubbelförsäkring serverside.

## Filer som ändras
- `supabase/functions/tracker-script/index.ts` — cookieless, DNT/GPC, consent-default, `forget()`.
- `supabase/functions/track-visit/index.ts` — hash-baserad visitor_id, IPinfo-gating, consent-flagga.
- `supabase/functions/purge-old-visits/index.ts` (ny) — retention-job.
- `supabase/functions/forget-visitor/index.ts` (ny) — radering på begäran.
- Migration: `tracking_sites.require_consent` default `true`, indexar för retention-radering.
- `src/pages/TrackingSettings.tsx` — GDPR-sektion + policy-text.
- `src/i18n/locales/{sv,en}.json` — översättningar.
- Cron-job (separat insert-SQL, inte migration).

## Att vara medveten om
- Befintliga sajter behåller sitt nuvarande `require_consent`-värde — bara nya får default `true`. Vi visar en banner i `/tracking-settings` som rekommenderar att slå på det.
- Hash-baserade visitor_id:n "rullar" varje midnatt UTC → samma fysiska besökare räknas som ny nästa dag. Det är priset för cookieless. Detta motsvarar Plausibles modell.
- Detta gör skriptet GDPR/ePrivacy-tryggt för 95% av användningsfallen. Ett fullständigt DPA-paket (avtalsmall) ligger utanför kod och bör tas fram juridiskt separat.
