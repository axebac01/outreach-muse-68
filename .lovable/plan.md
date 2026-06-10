## Mål
Säkerställa att gårdagens deliverability-arbete faktiskt fungerar i produktion. Vid genomgång hittade jag en kritisk bugg och några förbättringar som bör göras innan vi släpper för riktiga kunder.

## Kritisk bugg (måste fixas)

**Auto-paus triggas men kraschar alltid.** `email_accounts.status` har ett CHECK-constraint som bara tillåter `active | needs_reauth | error | disabled`. Triggern försöker sätta `paused_bounce`, vilket gör att UPDATE:n kastar fel. Eftersom triggern körs i samma transaktion som bounce-INSERT så **rullas hela bounce-inläggningen tillbaka** — vi förlorar bounce-data OCH pausen sker aldrig.

Fix: migration som ersätter CHECK-constraintet så `paused_bounce` är tillåtet.

## Andra förbättringar

1. **Dubbelräkning av bounces i triggern.** JOIN:en `email_messages` ↔ `bounces` på `(user_id, lower(email))` kan matcha flera meddelanden till samma mottagare → bounce-raden räknas flera gånger och rate blir för hög. Fix: räkna `count(DISTINCT b.id)` eller dra bounces direkt från `bounces`-tabellen utan join (filtrera på user_id + bounce_at + att mottagaren faktiskt skickats från kontot via EXISTS).

2. **Deliverability-koll blockerar OAuth-callback.** SPF/DKIM/DMARC-DNS-anrop läggs på ~1-2s extra latency vid kontokoppling. Inte kritiskt men onödigt. Fix: kör med `EdgeRuntime.waitUntil(...)` så svaret går tillbaka direkt och kollen fortsätter i bakgrunden.

3. **Edge-funktionerna är inte deployade.** `oauth-callback` och `connect-smtp-account` ändrades igår men servern kör fortfarande gammal kod. Måste deployas, annars körs aldrig deliverability-checken på nya konton.

4. **Saknar "Kör om kontroll"-knapp.** Om en användare fixar sin SPF-record finns inget sätt att uppdatera varningen utom att koppla om kontot. Fix: liten ikon-knapp i `EmailAccounts.tsx` som anropar befintliga `check-deliverability`-funktionen och sparar resultatet på kontot.

5. **Säkerhetskontroll: visa själva status-strängen "paused_bounce" till anon?** Vyn `email_accounts_safe` har `security_invoker = true` och filtrerar på `auth.uid()` så bara ägaren ser sin status — ok, inget läckage.

## Det jag INTE rör
- Bounce-tröskeln (8% / 20 sends / 24h) — bra utgångsläge, kan tunas efter riktiga data.
- Soft bounces — fortsatt utanför scope, bara hårda bounces auto-pausar.
- Reputation-monitoring externt (Postmaster Tools, Talos) — för stort för launch.

## Verifiering efter implementation
1. Migration applicerad: `SELECT pg_get_constraintdef(...)` visar `paused_bounce` i listan.
2. Manuell test: insert:a 25 hårda bounces för testkonto → status blir `paused_bounce`, banner syns, "Återaktivera" sätter tillbaka till `active`.
3. Koppla ett nytt SMTP-konto utan SPF → varningsbanner dyker upp inom några sekunder (efter att bakgrundskollen kört klart).
4. Klicka "Kör om kontroll" → anropet träffar edge-funktionen och uppdaterar `deliverability_checked_at`.

## Tekniska detaljer
- **Filer som ändras:**
  - Ny migration: ALTER CHECK-constraint + uppdaterad `auto_pause_on_high_bounce_rate`-funktion med distinct count.
  - `supabase/functions/oauth-callback/index.ts` + `connect-smtp-account/index.ts` — `EdgeRuntime.waitUntil` runt deliverability-blocket.
  - `src/pages/EmailAccounts.tsx` + `src/hooks/useEmailAccounts.ts` — refresh-knapp.
  - `src/i18n/locales/{sv,en}.json` — knapptext.
- **Deploy:** `oauth-callback`, `connect-smtp-account`, ev. `check-deliverability` (om hooken anropar den).

Säg till om jag ska köra det här rakt igenom, eller om något ska skippas.
