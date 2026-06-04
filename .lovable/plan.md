# Launch-readiness rapport — MailLead.ai

Jag har gått igenom hela appen (frontend, edge functions, databas, migrations) och listar här de allvarligaste problemen en tidig kund skulle stöta på. Ingen kod är ändrad än — det här är en diagnos, inte en fix.

## 🔴 BLOCKERARE — appen är inte säljbar i nuvarande skick

### 1. Inga cron-jobb är schemalagda → mejl skickas aldrig, inbox synkas aldrig
`pg_cron` är installerat (migration `20260505123619_*.sql`) men **inget enda `cron.schedule()`-anrop finns någonstans i kodbasen**. Det betyder:
- `process-scheduled-sends` körs aldrig automatiskt → en kund kan starta kampanj, se status "aktiv", och inget mejl går ut.
- `sync-inbox-cron` körs aldrig → svar dyker aldrig upp i inkorgen, leads som svarat fortsätter få uppföljningar.

Detta är produktens kärnloop. Utan fix är hela appen icke-funktionell.

### 2. Race condition → samma mejl kan skickas två gånger
`process-scheduled-sends/index.ts:76` hämtar rader med `status='scheduled'` men flyggar dem aldrig till `processing` innan loopen börjar. Om cron triggar två gånger samtidigt (eller någon klickar manuellt) skickas samma mejl till samma lead två gånger. Ingen `FOR UPDATE SKIP LOCKED`, ingen optimistisk lås.

### 3. OAuth-tokens går ut tyst → kund märker inget, mejl slutar bara fungera
När Google/Microsoft-tokens går ut returnerar `send-email` 500, raden markeras `failed`, men **kontot markeras aldrig som trasigt** och kunden får ingen notis. Hen ser bara att kampanjer slutar leverera utan förklaring. Status-meddelandet "reconnect" finns bara i serverloggar.

### 4. Google OAuth är "coming soon" i UI fast backend är klar
`ConnectEmailDialog.tsx:253` gråmarkerar Google-knappen, men `_shared/oauth.ts` har full Google-implementation (`exchangeGoogleCode`, `getValidGoogleAccessToken`). Gmail-användare (majoriteten av SMB) tvingas till SMTP, vilket är vår största drop-off-risk vid onboarding. Antingen aktivera knappen eller dölja den helt och göra SMTP-flödet betydligt tydligare.

### 5. Analytics visar fejkad data som ser äkta ut för nya användare
`Analytics.tsx:101` — när `hasAnyData=false` renderas `mockData` med fejkade kampanjnamn ("Q4 SaaS-VD:ar"), 14% svarsfrekvens, 23 avregistreringar. Datan blurras med en overlay, men siffrorna under blurren är de fejkade — inte nollor. En ny användare kan tro siffrorna är hens egna, sen tappa förtroendet när hen inser. Måste bytas mot ren empty state eller tydlig "DEMODATA"-banner.

## 🟠 HIGH — fixa första veckan

6. **Re-launch duplicerar utskick.** `launch-sequence/index.ts:44` kollar om det finns `scheduled_sends`-rader — men efter att alla skickats är listan tom igen och en ny launch dubblar allt. Bör kolla `sequences.status` istället.
7. **N+1 i schedulern.** ~10 sekventiella DB-anrop per scheduled_send-rad, upp till 500 per batch. Timeout-risk vid skala.
8. **Inbox-sync hämtar bara 14 dagar / 50 mejl.** Sena svar missas; leads får fortsatta uppföljningar fast de svarat.
9. **Ingen retry på transienta send-fel.** Ett Gmail 429 markerar raden permanent `failed`.

## 🟡 MEDIUM — kända problem att tracka

10. Throttle-cachen i schedulern återställs varje invocation → daglig gräns kan överskridas något.
11. Mobil layout bryts på Leads och Inbox (två-panelslayout utan responsiv collapse).
12. `track-visit` saknar rate-limiting → konkurrent kan spamma kunds spårningskvot.
13. `leads-search` använder `auth.getClaims()` som inte finns i supabase-js v2 — fungerar via internt API men är skört.
14. Inbox saknar empty state när inga mejlkonton är anslutna.
15. `bounces`-tabellen saknar DELETE-policy → "ta bort från bouncelista" skulle tyst misslyckas om det byggs.
16. `email_accounts` returnerar krypterade token-blobs via PostgREST till ägaren (onödig exponering, ej dekrypterbar klient-side).
17. Sändningsfönster-parsing är skör mot ogiltiga tidszoner (faller tyst tillbaka till UTC).

## Förslag på prioriterad åtgärdsordning

**Sprint 1 (innan första kund):** #1, #2, #3, #5, #6 — utan dessa kraschar produktupplevelsen.
**Sprint 2 (innan första betalda kund):** #4, #7, #8, #9 — påverkar leverans och konvertering.
**Sprint 3 (löpande):** #10–17.

## Vad jag rekommenderar härnäst

Jag föreslår att vi tar **Sprint 1 (blockerare 1, 2, 3, 5, 6) i ETT plan-paket** som nästa steg. #4 (Google OAuth) är en separat scope-fråga: vill du att jag aktiverar det, eller hellre döljer det helt och dubblar ner på SMTP-flödet?

Säg till om du vill att jag:
- (a) Går vidare med en konkret implementations-plan för Sprint 1, eller
- (b) Vill djupdyka i något enskilt fynd först, eller
- (c) Vill att jag verifierar/avfärdar något specifikt fynd innan vi fixar.