# Mål

Unibox ska som default endast visa trådar med inkommande svar. Utgående mejl (det du själv skickat) ska gömmas tills användaren aktivt klickar på "Skickat".

## Beteende

- **Default ("Inkorg")**: Visa endast trådar där `last_direction = 'inbound'` ELLER `unread_count > 0` ELLER tråden har minst ett inbound-meddelande. Pure outbound-trådar (ingen svarat ännu) syns inte.
- **"Skickat"-flik/filter**: Visa trådar där senaste meddelandet är `outbound` och inga svar finns. (Allt du skickat, väntar på svar.)
- **"Alla"** (befintlig "Visa alla mejl"-toggle): Oförändrad — visar även icke-lead-relaterade.

## UI (`src/pages/Inbox.tsx`)

Lägg till ett segmenterat filter högst upp i tråd-listan med tre lägen:
- **Inkorg** (default) — svar från leads
- **Skickat** — utgående utskick som väntar på svar
- (Befintlig "Visa alla mejl"-switch behålls separat för lead-related-filtret)

Persistera valet i `localStorage` (`inbox_view: "inbox" | "sent"`).

## Datalager (`src/hooks/useInbox.ts`)

Utöka `useInboxThreads(filters)` med `view?: "inbox" | "sent"` (default `"inbox"`):

- `view = "inbox"`: `.neq("last_direction", "outbound")` ELLER `.gt("unread_count", 0)` — enklast: `.or("last_direction.neq.outbound,unread_count.gt.0")`.
- `view = "sent"`: `.eq("last_direction", "outbound")`.

`useUnreadInboxCount` är redan korrekt (räknar `unread_count > 0`, vilket per definition är inbound).

## Vad ändras inte

- Databas: inga schema-ändringar. Vi använder existerande `last_direction` på `email_threads`.
- `is_lead_related`-filtret och dess toggle: oförändrade.
- Trådvyn när man klickar på en tråd: visar fortfarande hela konversationen (in + ut).
- Edge functions: oförändrade.

## Filer

- `src/hooks/useInbox.ts` — lägg till `view` i filters + query-logik.
- `src/pages/Inbox.tsx` — segmenterat filter (Inkorg/Skickat), localStorage, skicka `view` till hooken, uppdatera tomma states.
- `src/i18n/locales/{sv,en}.json` — strängar för "Inkorg" / "Skickat" / tom state.

## Verifiering

1. Default-vy: endast trådar där någon svarat syns. ✅
2. Klicka "Skickat": ser utskick som väntar på svar. ✅
3. Lead svarar på ett utskick → tråden flyttas från "Skickat" till "Inkorg". ✅
4. "Visa alla mejl"-toggle fungerar oberoende av Inkorg/Skickat. ✅
