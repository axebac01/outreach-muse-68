## Mål
Auto-tagga alla länkar i utgående mejl som pekar mot användarens spårade domäner, så att klick re-identifierar mottagaren mot lead-tabellen vid återbesök.

## 1. Hashad e-post-token (säkerhet)
För att inte exponera plaintext-mejl i URL:er bygger vi en kort, signerad token:
- `ml_e = base64url(lead_id_short).base64url(hmac_sha256(secret, lead_id))` — ~32 tecken, inte enumererbar.
- Ny secret: `TRACKING_LINK_SECRET` (auto-genereras i migration eller via `add_secret`).
- Servern verifierar HMAC innan koppling görs → ingen kan gissa andras token.

## 2. Ny helper: `tagLinksForTracking()`
Plats: `supabase/functions/_shared/trackingLinks.ts` (ny fil).

```ts
export async function tagLinksForTracking(
  html: string | undefined,
  text: string | undefined,
  opts: { leadId: string; userId: string; trackedDomains: string[]; secret: string }
): Promise<{ html?: string; text?: string }>
```

Beteende:
- Genererar token från `leadId + secret`.
- I HTML: regex över `<a href="...">`, parsar URL:en, om hostname matchar någon av `trackedDomains` (med eller utan `www.`) → lägg till `?ml_e=<token>` (eller `&ml_e=` om query finns). Hoppar över om `ml_e=` redan finns.
- I text: motsvarande regex för `https?://...`-länkar.
- Idempotent — säkert att köra flera gånger.

## 3. Hooka in i `send-email`
I `supabase/functions/send-email/index.ts`, precis före `ensureUnsub`-anropet (rad ~228):
- Hämta `tracking_sites.domain` för `userId` (cachable, en query).
- Om `lead_id` finns och listan inte är tom → kör `tagLinksForTracking()` på `body_html` + `body_text`.
- Annars: hoppa över (inga taggade länkar för användare utan tracking).

`process-scheduled-sends` behöver ingen ändring — den anropar `send-email` som redan kör helpern.

## 4. Tracker-skriptet läser `ml_e`
I `tracker-script/index.ts`, i `sendInitial()` (rad ~102):
- Läs `params.get('ml_e')`, skicka som `ml_e` i payloaden.
- Direkt efter: `history.replaceState({}, '', url_utan_ml_e)` så token inte läcker via referrer eller bokmärken.

## 5. `track-visit` verifierar token och kopplar lead
I `track-visit/index.ts`, i pageview-grenen:
- Om `ml_e` finns → splitta i `lead_id_short.signature`, slå upp lead, verifiera HMAC mot `TRACKING_LINK_SECRET`. Vid match → sätt `leadId` (gå förbi e-post-flödet).
- Persisteras redan i `visitors`-raden via befintlig kod.
- **Sticky lead**: om `visitors`-raden för `visitor_id` redan har `lead_id` och nytt anrop saknar `ml_e` → behåll befintlig `lead_id` (idag skrivs den över med `null`-fallthrough — fixas så `lead_id` bara *sätts*, aldrig nollas).

## 6. UI: klick-/besöksstatistik per kampanj
Två tillägg på `/inbound`:
- **Identifierade besökare** (sektion överst): listar `visitors WHERE lead_id IS NOT NULL` med namn, företag, senaste besök, antal besök, senast besökt sida. Klick → öppnar lead-detaljer.
- **Notis på `inbound_notifications`**: när en lead-matchning sker i `track-visit` (via `ml_e`) och senaste notis för paret är > 24h gammal → skapa "Anna från Acme klickade din mejl-länk och besökte /pricing".

Ny hook `useIdentifiedVisitors()` i `src/hooks/useInbound.ts`, ny komponent-sektion i `src/pages/Inbound.tsx`.

## 7. UI: visa att tracking finns på `/tracking-settings`
Ny förklaringsruta: "Vi taggar automatiskt länkar i utgående mejl som pekar på din spårade domän. När en mottagare klickar identifieras de mot din lead-lista — även vid framtida återbesök." Plus toggle `auto_tag_email_links` (default på) på `tracking_sites`.

## Filer
- **Ny migration**: lägg till kolumn `tracking_sites.auto_tag_email_links boolean not null default true`.
- **Ny secret**: `TRACKING_LINK_SECRET` (begärs via `add_secret`).
- **Ny fil**: `supabase/functions/_shared/trackingLinks.ts`.
- **Edit**: `supabase/functions/send-email/index.ts` — anropa helpern.
- **Edit**: `supabase/functions/tracker-script/index.ts` — läs `ml_e`, rensa URL.
- **Edit**: `supabase/functions/track-visit/index.ts` — verifiera token, sticky `lead_id`, notis.
- **Edit**: `src/hooks/useInbound.ts` — `useIdentifiedVisitors()`.
- **Edit**: `src/pages/Inbound.tsx` — ny sektion.
- **Edit**: `src/pages/TrackingSettings.tsx` — förklaring + toggle.
- **Edit**: `src/i18n/locales/{sv,en}.json` — översättningar.

## Att vara medveten om
- Endast länkar till **egna spårade domäner** taggas — externa länkar (LinkedIn, kalendrar, dokument) lämnas orörda. Det betyder att om en lead bara klickar en kalenderlänk får vi ingen identifiering, vilket är korrekt (annars läcker e-post till tredje part).
- Token är låst till `lead_id`. Om mottagaren forwardar mejlet → kollegans klick taggas som ursprunglig lead. Sällsynt men värt att veta.
- `ml_e` rensas från URL:en direkt vid pageload, så bokmärken och Google Analytics fångar inte upp den.
- Cookieless visitor-id "rullar" varje midnatt UTC, men `lead_id`-kopplingen i `visitors`-raden består tills hash:en byts → bästa praxis är att tagga ALLA länkar i utskick så återbesök blir re-identifierade vid behov.