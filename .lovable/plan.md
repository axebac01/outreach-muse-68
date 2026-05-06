## Problem

Snippeten på `crmdata.se` laddas och triggar OPTIONS-preflight till `track-visit`, men **ingen POST** kommer fram. Orsak: `navigator.sendBeacon` accepterar inte `application/json` som Blob-type — webbläsaren avvisar tyst och vi kollar aldrig returvärdet, så fallback till `fetch` triggas inte.

`tracking_sites.last_ping_at` förblir `null` → verifieringen timeout:ar trots korrekt installation.

## Fix

### 1. `supabase/functions/tracker-script/index.ts`
Ändra sendBeacon till att använda `text/plain` (CORS-safelisted, accepteras av sendBeacon) och kolla returvärdet med fetch-fallback:

```js
var ok = false;
try {
  if (navigator.sendBeacon) {
    var blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
    ok = navigator.sendBeacon(endpoint, blob);
  }
} catch(e) {}
if (!ok) {
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: 'cors'
    });
  } catch(e) {}
}
```

Bonus: `text/plain` är en "simple request" → ingen CORS-preflight alls → snabbare och mer robust mot strikt CSP.

### 2. `supabase/functions/track-visit/index.ts`
`req.json()` fungerar redan oavsett content-type (läser bytes), så ingen serveränding krävs. Men för säkerhets skull byter vi till manuell parsing som tål både JSON-body och text:

```ts
const raw = await req.text();
const body = raw ? JSON.parse(raw) : {};
```

### 3. Bumpa cache-tiden ner tillfälligt
Sätt `Cache-Control: public, max-age=60` (från 300) i `tracker-script` så användare som redan har gamla snippeten cachad får den nya inom en minut.

### 4. Verifieringsdialogen
Ingen ändring behövs — så fort POST når servern uppdateras `verified_at` och Realtime triggar success-state.

## Test efter deploy
1. Hårdrefresha `crmdata.se` (Cmd+Shift+R) för att tömma snippet-cache
2. Öppna Network-fliken → filtrera på `track-visit` → bekräfta att en POST 200 går iväg
3. Kolla `/settings/tracking` — badge ska bli grön "Aktiv" inom sekunder

## Filer som ändras
- `supabase/functions/tracker-script/index.ts` — sendBeacon content-type + fallback
- `supabase/functions/track-visit/index.ts` — robust body-parsing