## Kort svar

Ja, sekvenserna fungerar end-to-end. Jag har granskat hela pipelinen och hittat bevis på att det redan har skickats mejl på riktigt (3 sent, 1 failed historiskt). Det finns dock några konkreta saker att verifiera/justera innan du startar en skarp kampanj.

---

## Vad jag verifierade

**Pipeline (fungerar):**
1. `launch-sequence` schemalägger steg 1 för alla pending leads, fördelar över avsändare, sätter sekvens till `active`.
2. `process-scheduled-sends` körs i cron (loggar visar boot var ~5:e min). Den:
   - kollar lead-status (cancellerar för replied/unsubscribed/bounced/completed)
   - kollar bounces-tabellen
   - respekterar sändningsfönster + tidszon (`Europe/Stockholm` på din TEST-sekvens)
   - respekterar warmup-trappa (20 + dag*5, max 50) och `daily_cap_override`
   - throttlar 30–120s mellan sändningar per inbox
   - skickar via Gmail API / Microsoft Graph / SMTP
   - skedulerar nästa steg efter `wait_days`
   - sätter lead till `completed` när sista steget är skickat
3. `send-email` lägger på List-Unsubscribe-headers, unsubscribe-footer, plaintext-alternativ från HTML, länktaggning för besöksspårning, och loggar i `email_messages`.
4. `sync-inbox` detekterar svar och sätter lead → `replied` när `pause_on_reply` är på (default).

**Nuvarande databasstatus:**
- 1 lead i `pending` (ej startad ännu)
- 0 schemalagda sändningar i kö
- Historik: 3 sent, 1 failed (gammalt decrypt-fel, redan löst)
- TEST-sekvens har 4 steg (0/3/3/3 dagars väntan), Europe/Stockholm, active

---

## Att göra innan skarp körning

### 1. Ta bort `[TEST]`-prefix i ämnesraderna
De senaste skickade mejlen hade "[TEST] idé för …". Kolla att stegens `subject` är produktionsmässiga innan du lägger till leads.

### 2. Verifiera ett riktigt avsändarkonto
Två konton finns aktiva (`axel.backstrom@crmdata.se` via Outlook och `axebac01@gmail.com` via Gmail). Skicka ett testmejl från Avsändare-tabben (eller via "Send test email"-dialogen) till en egen adress för att bekräfta att tokens fortfarande är giltiga och att signatur/avsändarnamn ser rätt ut.

### 3. Mjuk start (warmup respekteras automatiskt)
Nya konton är låsta till 25→50 mejl/dag enligt warmup-trappan. För skarp körning rekommenderas att börja med max 25 leads per konto per dag och 2–3 avsändare för att fördela risken.

### 4. Bekräfta sändningsfönster och tidszon
TEST-sekvensen är inställd på Europe/Stockholm, mån–fre, 09:00–17:00 (default). Kontrollera på fliken "Schema" att det matchar när dina mottagare faktiskt läser mejl.

### 5. Kontrollera unsubscribe + bounces
- Unsubscribe-länkar läggs på automatiskt i alla mejl (List-Unsubscribe + footer).
- Bounces läses in via `sync-inbox` (NDR-detektering) — verifiera att inkorgen synkar genom att titta i Inkorgen efter senaste hämtning.

### 6. Pause-on-reply
`pause_on_reply` är på som default per sekvens. När en lead svarar markeras hen som `replied` och uppföljningar skickas inte. Bra default — låt vara på.

### 7. Skicka ett "rad-1 dry run"
Lägg till 1 lead (dig själv eller en kollega), starta sekvensen, vänta tills processorn skickar (max ~5 min). Verifiera:
- mejl landar i rätt inbox (inte spam)
- ämne + variabler ({{first_name}}, {{company}}) renderar korrekt
- svar pausar uppföljning
- nästa steg dyker upp i `scheduled_sends` med rätt tidpunkt

---

## Kända svagheter / förbättringsförslag (kan vänta)

- **Sync-inbox körs inte automatiskt** — kollar bara när du öppnar Inkorgen i UI. Det betyder att `replied`-status kan dröja. Om detta är kritiskt: schemalägg `sync-inbox` på cron var 5–10 min per användare.
- **Ingen retry vid send-fel** — om en sändning failar (token utgången, rate limit) sätts den till `failed` direkt, ingen exponential backoff.
- **Throttle är per-process** (in-memory cache i en processor-körning). Om cron startar två parallella runs kan throttlingen kringgås. I praktiken inget problem med 5-min intervall + 50 batch.
- **Ingen "skicka direkt"-knapp för enstaka mejl** från sekvensvyn — bara via test-dialog.

---

Vill du att jag aktiverar sync-inbox-cron och/eller bygger en liten "verifiera inför start"-checklista i UI:t (kontoval, sändningsfönster, leads, ämnesförhandsvisning) innan jag rör något annat?
