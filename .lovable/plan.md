## Mål
Eliminera de brutna löftena i pricing/UI på minuter, så vi inte säljer features som inte finns. Ingen ny funktionalitet byggs — vi städar copy och plockar bort/ersätter rader. Övriga risker (Stripe go-live, realtime-bugg, deliverability) hanteras i separata steg efteråt.

## Ändringar — pricing-features (`src/i18n/locales/sv.json` + `en.json`)

**Free** — oförändrad.

**Starter** — oförändrad. (Verifiera separat att CSV-export faktiskt finns; om inte, stryk raden.)

**Growth** — ta bort eller märk:
- ~~"A/B-test av sekvenssteg"~~ → **borttagen**
- ~~"Anpassad spårningsdomän"~~ → **borttagen**
- ~~"3 team-platser"~~ → **borttagen**
- Behåll: obegränsade kampanjer, 10 sändarkonton, 1 000 credits/mån, AI-intent på svar, prio support
- Lägg till en realistisk rad istället: "Inbound-signaler när kampanjen är live" eller liknande befintlig funktion (verifieras i koden innan vi skriver)

**Scale** — ta bort eller märk:
- ~~"API + webhooks"~~ → **borttagen**
- ~~"10 team-platser"~~ → **borttagen**
- ~~"Avancerad deliverability-monitoring"~~ → ersätts med "Bounce-skydd & auto-paus" (om/när vi bygger nätet i punkt 5 nedan) — tills dess **borttagen**
- Behåll: 25 sändarkonton, 3 000 credits, dedikerad CSM
- Notera: "Dedikerad CSM" är OK manuellt vid launch-volym.

**Enterprise** — behåll som är. SSO/SAML, DPA, on-prem IP-pool säljs case-by-case, inte automatiskt.

**Credit-usage-tabellen** — behåll "(kommer snart)"-raderna för mobilnummer och deep ICP-research, de är tydligt markerade.

## Ändringar — övrig copy

**`src/i18n/locales/sv.json` rad 52** (`auth.googleDesc`):
- Ta bort raden helt, eller byt till "Mer inloggningsmetoder kommer snart." Vi vill inte säga "Google kommer snart" när vi inte planerar att aktivera den just nu.
- Alternativ: aktivera Google sign-in för app-login (10 min med `supabase--configure_social_auth`). **Föreslag: vi aktiverar Google sign-in samtidigt** — det är trivialt, redan stött via Lovable Cloud, och tar bort ett brutet löfte istället för att gömma det. Lägger till en `<Button>` på `Login.tsx` och `Signup.tsx` som anropar `supabase.auth.signInWithOAuth({ provider: 'google' })`.

**`src/components/AuroraLanding.tsx`** — verifiera att inget i hero/features-sektionen påstår något vi inte har (A/B-test, custom domain, team). Snabbskum, inga ändringar förväntade utöver det vi redan vet.

## Tekniska detaljer

Filer som ändras:
- `src/i18n/locales/sv.json` — rader 231–273 (features-block) + rad 52 (googleDesc)
- `src/i18n/locales/en.json` — motsvarande nycklar
- `src/pages/Login.tsx`, `src/pages/Signup.tsx` — Google-knapp + i18n-nyckel `auth.continueWithGoogle`
- Aktivera Google-provider via `supabase--configure_social_auth({ providers: ["google"] })`

Inga DB-ändringar, inga edge functions, ingen Stripe-konfig.

## Vad som INTE ingår i denna plan (separata uppdrag efteråt)

1. **Stripe go-live** — `payments--get_go_live_status` för att se vad som är kvar; du måste själv slutföra steg 1–3 i Stripe-dashboarden.
2. **Realtime-bugg för subscriptions-kanaler** — väntar på sub-agent-rapporter (`sub_05rhq9s4`, `sub_c8qat7s7`); fixas separat när vi har orsak.
3. **Deliverability-säkerhetsnät** — bounce-tröskel + SPF/DKIM-check vid OAuth-koppling. Större ändring, kräver egen plan.
4. **Legal-check** — DPA-mall + uppdaterad subprocessors-sida. Manuell uppgift, ingen kod.

## Verifiering

1. Öppna `/pricing` — Growth och Scale visar bara features vi faktiskt har.
2. Inloggad användare ser ingen "Google kommer snart"-text någonstans.
3. På `/login` och `/signup` finns en "Fortsätt med Google"-knapp som funkar end-to-end (testas i preview).
4. `npm`-byggsteget passerar utan typfel.

## Ordning

1. Städa `sv.json` + `en.json` (features + googleDesc)
2. Aktivera Google OAuth via `configure_social_auth`
3. Lägg till Google-knapp i `Login.tsx` + `Signup.tsx`
4. Verifiera i preview att Google-flödet funkar

Säg till om du vill skippa Google-aktiveringen och bara ta bort copyn — då blir det ännu snabbare.
