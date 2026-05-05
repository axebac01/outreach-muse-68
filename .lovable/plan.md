## Mål

En "Unibox" där alla inkommande mejlsvar – från alla anslutna mejlkonton och alla kampanjer – samlas på ett ställe. Du kan:
- Se alla konversationer (sorterade efter senaste aktivitet, oläst-markerade)
- Filtrera per konto, kampanj/sekvens och status (oläst, alla, behöver svar)
- Öppna en tråd, läsa hela historiken (utgående + inkommande)
- Svara direkt i appen – svaret går från rätt mejlkonto, i rätt tråd
- Markera som läst/arkiverad

## Vad byggs

### 1. Backend — datamodell

Vi bygger på den befintliga `email_messages`-tabellen (där utgående mejl redan loggas). Lägger till:

- Nya kolumner på `email_messages`: `is_read` (bool), `is_archived` (bool), `sequence_id` (uuid, nullable), `snippet` (text – kort förhandsvisning)
- Ny tabell `email_threads` (cache för UI-prestanda): `id`, `user_id`, `email_account_id`, `thread_id` (provider), `subject`, `participants` (text[]), `last_message_at`, `unread_count`, `lead_id`, `sequence_id`
- Index på `(user_id, last_message_at desc)` och `(thread_id, email_account_id)`
- RLS: bara ägaren kan se/uppdatera sina trådar och meddelanden

### 2. Backend — sync av inkommande mejl

Ny edge-funktion `sync-inbox` som körs per konto:
- **Gmail (OAuth)**: använder `users/me/history.list` med sparat `history_id` för delta-sync (eller `messages.list?q=newer_than:7d` om historyId saknas). Hämtar nya inkommande mejl, parsar headers (Message-ID, In-Reply-To, References, From, Subject) och body.
- **IMAP (SMTP-konton)**: anslut via existerande IMAP-konfig, läs UIDs > `imap_last_uid` i INBOX, hämta nya mejl.
- För varje nytt mejl: hitta matchande utgående mejl via `In-Reply-To`/`References` → koppla `lead_id`, `sequence_id`, `thread_id`. Spara som `direction: "inbound"`.
- Uppdatera `email_threads` (upsert) med `last_message_at`, öka `unread_count`.
- Om `sequences.pause_on_reply = true` → markera `sequence_leads.status = "replied"` så uppföljningar pausas.

Trigger för sync:
- Manuell "Hämta nytt"-knapp i Unibox (anropar `sync-inbox` för alla aktiva konton)
- Automatisk: Realtime-prenumeration på `email_messages` så nya rader dyker upp direkt i UI

(Cron-baserad bakgrundssync kan läggas till senare – för nu räcker manuell + on-open trigger när du öppnar Unibox.)

### 3. Frontend — Unibox-sida

Ny route `/inbox` med 3-kolumnslayout:

```text
+------------+----------------------+--------------------------+
| Filter     | Trådlista            | Konversation + svarsruta |
| - Konto    | [Avsändare/ämne]     | [Hela tråden, äldst→ny]  |
| - Sekvens  | [Snippet · 2 tim]    |                          |
| - Status   | [Oläst-badge]        | [Skriv svar...]          |
+------------+----------------------+--------------------------+
```

Komponenter:
- `Inbox.tsx` – sida med layout och routing (`/inbox` och `/inbox/:threadId`)
- `ThreadList.tsx` – virtualiserad lista med oläst-fetstil, snippet, tidsstämpel, sekvensnamn-badge
- `ThreadView.tsx` – hela trådens mejl som "chattbubblor" (utgående höger, inkommande vänster), citerad text kollapsad
- `ReplyComposer.tsx` – textfält + skicka-knapp; använder `send-email`-funktionen med `in_reply_to` satt och `from` = ursprungligt konto
- Markera som läst när tråden öppnas
- Realtime via Supabase channel på `email_messages` → invalidate trådlistan

Lägg till "Inbox"-länk i Navbar med oläst-räknare (badge).

### 4. Översättningar

Lägga till sv/en strängar för Unibox under `inbox.*` namespace.

## Tekniska detaljer

- Migration lägger till nya kolumner + tabell + RLS-policies + realtime-publication för `email_messages` och `email_threads`.
- `send-email` används återanvänt för svar (sätter `in_reply_to`, kopierar `to_address` från inkommande, hittar rätt `email_account_id` från tråden).
- `sync-inbox` schemaläggs INTE som cron i denna iteration (kan läggas till senare med pg_cron); manuell + Realtime räcker för MVP.
- Feltolerant: om ett konto inte kan synca (token utgången etc.) sätts `email_accounts.status_message`, övriga konton fortsätter.

## Avgränsning (gör vi INTE nu)

- Bilagor (visning eller utgående)
- Etiketter/mappar
- Bakgrundscron (manuell sync + Realtime räcker som MVP)
- Tråd-arkivering med smart filter (vi har bara läst/oläst för nu)

Säg till om något ska ändras eller läggas till innan jag bygger.