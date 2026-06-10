## Mål
Säkerhetsnät så att skarpa kampanjer inte raserar avsändar-reputation. Två delar:

1. **Bounce-skydd:** auto-pausa email-konton som börjar bounca för mycket.
2. **SPF/DKIM/DMARC-koll:** kör automatiskt när ett konto kopplas, så användaren ser varningar innan första kampanjen.

Inga marknadsföringslöften ändras — vi bygger något som faktiskt fungerar och kan därför också sätta tillbaka "Bounce-skydd & auto-paus" som Scale-feature efteråt.

## Del 1 — Bounce-skydd med auto-paus

### Databas
Migration som lägger till på `email_accounts`:
- `paused_reason text` (null när konto är aktivt; sätts till t.ex. `high_bounce_rate`)
- `paused_at timestamptz`

Lägg till ny enum-status `paused_bounce` (vi använder befintliga `status`-kolumnen).

### Trigger på `bounces` INSERT
Efter varje ny bounce, räkna senaste 24 h sändningar + bounces för det konto som mejlet skickades från. Logik:

- Hämta `email_account_id` från senaste outbound `email_messages` till `bounces.email` för samma user (senaste 7 dagar).
- Räkna sent vs hard bounces för det kontot senaste 24 h.
- **Tröskel:** minst 20 sändningar OCH bounce-rate ≥ 8% → sätt `email_accounts.status = 'paused_bounce'`, `paused_reason = 'high_bounce_rate'`, `paused_at = now()`.
- Det befintliga flödet pausar redan `scheduled_sends` när konto inte är `active` (`rearm_paused_sends_on_account_active`-triggern återupptar när admin manuellt sätter aktiv igen).

### UI
- `ReconnectBanner.tsx` (eller ny `BounceAlertBanner`) visar varning på `/email-accounts` om något konto har `status = 'paused_bounce'`. Förklarar varför och knapp "Återaktivera" som sätter tillbaka till `active` (triggern rearm:ar sends automatiskt).
- i18n-strängar på sv/en.

### Tysta krav
- Triggern är `SECURITY DEFINER` med `search_path = public`.
- Inga refunds berörs (bibehåller `bounces_auto_refund`).

## Del 2 — SPF/DKIM/DMARC vid koppling

### Backend
- `check-deliverability` finns redan. Kör den automatiskt:
  - I slutet av `oauth-callback/index.ts` efter att `email_accounts` skapats.
  - I slutet av `connect-smtp-account/index.ts` efter insert.
- Resultat sparas på email_accounts i en ny JSONB-kolumn `deliverability_check` (status per record + tid).
- Migration lägger till `deliverability_check jsonb` + `deliverability_checked_at timestamptz`.

### UI
- `DeliverabilityCheck.tsx` finns. På `/email-accounts` visa ett varningstecken (gult) på rader där `deliverability_check.spf|dkim|dmarc` saknar OK — klick öppnar befintlig komponent.
- Ingen tvångsblock — bara varning så användaren kan fixa DNS innan stor kampanj.

## Tekniska detaljer

Filer som ändras:
- **Ny migration:** kolumner + trigger-funktion + trigger på `bounces`.
- `supabase/functions/oauth-callback/index.ts` — anropa `check-deliverability` internt efter account create (eller inline samma DNS-checks).
- `supabase/functions/connect-smtp-account/index.ts` — samma.
- `src/pages/EmailAccounts.tsx` + ny eller utökad banner-komponent.
- `src/i18n/locales/sv.json` + `en.json` — nya strängar.
- Återinför "Bounce-skydd & auto-paus" som Scale-feature i sv/en.

Inga ändringar i Stripe-flödet, inga edge functions raderas.

## Verifiering

1. Migration applicerad utan fel.
2. Manuell test: insert 25 bounces för ett konto via SQL → konto sätts till `paused_bounce`, banner syns på `/email-accounts`, klick på "Återaktivera" → status tillbaka till `active`, scheduled sends rearm:as.
3. Koppla nytt SMTP-konto med domän utan SPF → varningsikon syns direkt på listan.
4. `npm`-build passerar.

## Vad som INTE ingår
- Reputation-monitoring via externa tjänster (Postmaster Tools, etc.) — för stort.
- Per-mottagare suppression list (utöver befintliga `unsubscribes` och `bounces`).
- Soft bounce-hantering — vi auto-pausar bara på hard bounces (befintlig `hard = true`-logik).

## Ordning
1. Migration (kolumner + trigger).
2. Edge function-ändringar.
3. UI + i18n.
4. Återinför Scale-feature i pricing-locale.
5. Manuell verifiering.

Vill du köra hela paketet, eller bara Del 1 (bounce-skydd) först?
