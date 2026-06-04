# Sprint 2 — Prestanda, retry & dataintegritet

Mål: göra schemaläggaren effektiv och självläkande utan att ändra hur features beter sig för användaren. Inga UI-ändringar i denna sprint.

## A. Batcha bort N+1 i `process-scheduled-sends` (#7)

Idag gör loopen per rad: `sequence_leads`, `bounces`, `sequences`, `email_accounts`, `email_account_sending_limits`, `sent today count`, `sequence_steps`, `prior message`. Vid 50 rader = ~400 round-trips ⇒ funktionen riskerar att tajma ut innan batchen är klar.

**Fix:** efter claim, gör fem batchade SELECTs upfront och bygg maps:
- `sequence_leads` WHERE id IN (...) — alla leads i batchen
- `bounces` WHERE user_id IN + lower(email) IN
- `sequences` WHERE id IN (cache:ad redan, men flytta till en query)
- `email_accounts` + `email_account_sending_limits` WHERE id IN
- `sequence_steps` WHERE id IN
- `sent today counts`: ett aggregat-query (`select email_account_id, count(*) … group by`) istället för ett count per konto
- `prior outbound message`: en query med `IN (lead_id, sequence_id)`-par via `or(...)`-filter, eller skippa cache och gör per-rad bara om mejlet faktiskt är ett uppföljningssteg

Behåll caches inom loopen som fallback. Mål: ≤10 DB-queries totalt per batch oavsett storlek.

## B. Sync-inbox-fönster + idempotens (#8)

Nuvarande `syncGmail` hämtar alltid `newer_than:14d` och `LIMIT 50`. Problem:
- Vid större backlog (>50 nya mejl per 10-min-fönster, t.ex. efter outage) tappar vi mejl permanent eftersom Gmail-listan inte är paginerad.
- För konto som varit pausat >14 dagar missar vi allt däremellan.
- `existing`-kollen via `provider_message_id` görs per meddelande ⇒ N+1.

**Fix:**
1. Använd `historyId` (Gmail) / `deltaToken` (Graph) när det redan finns sparat på `email_accounts.history_id`. Fall tillbaka till `newer_than:Xd` bara vid första körningen.
2. Pagina listan med `pageToken` tills allt nytt sedan `history_id` är hämtat (med tak, t.ex. 500 per körning för säkerhet).
3. Förladda alla `provider_message_id` för kontot i batchen i ett enda query istället för per meddelande.
4. För IMAP: behåll `imap_last_uid`-strategin (verifiera att den redan finns och fungerar).
5. Outlook: använd `@odata.nextLink` paginering om den saknas.

## C. Retry på transienta fel (#9)

Idag: vilket fel som helst från Gmail/Graph/SMTP markerar raden `failed` permanent. Tillfälliga 429/5xx/network-fel bränner försök i onödan.

**Fix:** i `send-email`:
- Wrappa providerns send-anrop i en retry-helper: max 3 försök, exponentiell backoff (1s, 4s, 12s), jitter.
- Retry endast vid: HTTP 408/429/500/502/503/504, `fetch`-network-fel, SMTP `4xx`-koder.
- Andra fel (4xx-permanenta, autentisering) faller igenom direkt.
- I `process-scheduled-sends`: vid `send-email` 5xx-svar, sätt raden tillbaka till `scheduled` + `scheduled_for = now()+5min` upp till `attempts < 3` (kräver ny kolumn `attempts int default 0` på `scheduled_sends` — migration). Efter 3 misslyckanden ⇒ `status='failed'`.

## D. FK CASCADE för `scheduled_sends.email_account_id` (Nytt)

Om en användare raderar ett trasigt e-postkonto och lägger till ett nytt blir kvarvarande `paused_account_error`/`scheduled`-rader föräldralösa (refererar till borttaget konto-ID). Re-arm-triggern fungerar inte. Idag står `scheduled_sends.email_account_id` antingen utan FK eller utan CASCADE.

**Fix:** migration som droppar befintlig FK (om finns) och lägger till `ON DELETE CASCADE`. Verifiera även `sequence_leads`, `sequence_steps`, `lead_id`, `sequence_id` har vettiga CASCADE/SET NULL-regler — fixa bara de som är fel.

## E. Större batch + rättvisare ordning (Nytt)

`MAX_BATCH=50` med `order by scheduled_for asc` ⇒ vid backlog svältar nyare rader.

**Fix:**
1. Höj `MAX_BATCH` till 200.
2. Byt ordning till `(user_id, scheduled_for asc)` så ingen enskild användare kan monopolisera en batch. Alternativ: round-robin per `email_account_id`.
3. Lägg till en mjuk tidsbudget i loopen: bryt om körningen pågått >20s så cron-jobbet alltid hinner returnera innan timeout.

## Tekniska detaljer (för referens)

- Ny kolumn: `scheduled_sends.attempts int not null default 0`. Bumpas vid retry, nollställs vid lyckad send.
- Migration på FK kräver att vi först läser `pg_constraint` för befintlig referens; om ingen finns lägger vi bara till en med CASCADE.
- Retry-helpern läggs i `_shared/retry.ts` så `sync-inbox` kan återanvända den senare.

## Verifiering efter implementation

- Logga `processed/sent/deferred/failed/requeued` per körning och kolla att antalet DB-queries sjunker drastiskt (manuellt anrop med 50 due rows ⇒ förvänta <15 queries).
- Tvinga 503 från Gmail mockat (eller temporärt skicka till ogiltigt scope) ⇒ rad ska gå `scheduled → scheduled+5min` 3 gånger, sedan `failed`.
- Radera ett kopplat e-postkonto med scheduled rader ⇒ raderna ska försvinna.
- Tvinga >50 inkommande mejl ⇒ alla ska hamna i `email_messages` över max 1–2 körningar.

## Utanför scope

Sprint 3 (#10–#17): throttle, mobillayout, rate-limit-UI, auth-byte, empty state, bounces DELETE, krypterad token-vy, timezone-validering.

Säg "kör" så börjar jag med A (största risken om scheduler tajmar ut) och jobbar nedåt.
