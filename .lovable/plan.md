# Bygg IMAP-sync så svar fångas för SMTP-konton

## Kort svar
Det går. Allt utom själva pull-koden finns redan: vi krypterar och lagrar IMAP-lösenord i `email_accounts.imap_password_enc`, har `imap_host/port/secure/username` och en `imap_last_uid`-kolumn för progress. Edge functions kör Deno som kan öppna TLS-sockets (`Deno.connectTls`) och köra Node-IMAP-bibliotek via `npm:`-specifier. Vi behöver inte byta arkitektur — bara lägga till en `syncImap()`-väg i befintliga `sync-inbox` och släppa filtret i cron-jobbet.

## Vad som ändras

### 1. `sync-inbox-cron`
Idag: `auth_type IN ('oauth')`. Ändra till att inkludera SMTP-konton som har IMAP konfigurerat:
```text
status = 'active' AND (auth_type = 'oauth' OR (auth_type = 'smtp' AND imap_host IS NOT NULL))
```

### 2. `sync-inbox` — ny `syncImap(admin, account)`
- Dekryptera `imap_password_enc` via befintlig `decryptToken` (samma som send-email använder).
- Koppla med `npm:imapflow` (Node-kompatibel, fungerar i Deno edge runtime — vi kollar i implementationen och faller tillbaka till en minimal egen IMAP-klient om imapflow strular).
- `mailbox.open('INBOX', { readOnly: true })` — vi vill inte markera lästa.
- Hämta nya UIDs sedan `account.imap_last_uid` (eller senaste 14 dagarna om null, samma fönster som Outlook-vägen idag).
- Begränsa batch till 50 meddelanden per körning för att hålla edge-function-timeout (~150 s).
- Parsa varje rå MIME-payload med `npm:mailparser` → mappa till befintlig `ParsedMessage`-form (from, to, subject, date, message_id_header, in_reply_to, references, body_text/html, snippet).
- Skicka in i befintliga `persistInbound()` (bounce-detektion, lead-matchning, paus av sekvens, allt återanvänds gratis).
- Uppdatera `account.imap_last_uid` = max UID efter lyckad batch.
- Skydd: timeout-wrapper på 90 s för hela IMAP-sessionen, alltid `client.logout()` i `finally`.

### 3. Felhantering + status
- Auth-fel (lösenord ändrat, MFA aktiverat): sätt `email_accounts.status = 'error'` + `status_message`. UI visar redan en banner via befintlig status-kolumn.
- TLS/anslutningsfel: räkna som tillfälligt, logga, returnera 200 i cron (annars blockerar ett konto hela batchen — befintlig cron-loop fångar redan errors per konto).
- Gmail via app-lösenord och Outlook IMAP fungerar med samma `imapflow`-kod.

### 4. UI-flagga "Mottagning aktiv"
I `EmailAccountsPage`/listan: visa en liten indikator per konto baserat på `last_synced_at`. SMTP-konton som saknar IMAP får en varning "Vi kan inte detektera svar för det här kontot — lägg till IMAP under inställningar". Förhindrar att en användare lägger till bara SMTP utan att förstå risken.

### 5. Onboardings-hård kravnivå
I `ConnectEmailDialog`: gör IMAP-fälten **obligatoriska** för SMTP-typen (idag valfria). Befintlig auto-prefyll (`smtp.foo` → `imap.foo`) gör detta smärtfritt för de flesta. Om användaren explicit inte har IMAP (sällsynt) ska de få en uttrycklig varning med kryssruta "Jag förstår att inkommande svar inte upptäcks" innan kontot kan sparas.

## Tekniska detaljer

- `imapflow` använder Node net/tls — Deno's `npm:`-loader polyfillar detta. Vi verifierar i en första boot. Om någon edge case dyker upp (sällsynt) finns plan B: en ~200-radig egen IMAP-klient som bara gör LOGIN → SELECT → UID SEARCH → UID FETCH och låter `mailparser` parsa rådatan.
- Concurrency: cron-jobbets nuvarande `BATCH=5` parallella users behålls. Per user kör vi konton sekventiellt (oftast 1–2 konton/user) för att inte slå i memory-tak.
- UID-tracking är per konto. Om en användare flyttar mailbox eller IMAP-servern återanvänder UIDs (sällsynt — UIDVALIDITY) detekterar vi det och nollställer `imap_last_uid` så vi börjar om från 14 dagar tillbaka.
- Allt skrivs via samma `persistInbound`, så de skyddslager vi precis byggde (reply-detektion utan thread-headers, auto-reply-filter, `cancelled_reason`) gäller automatiskt också för IMAP.

## Vad jag INTE bygger nu
- IDLE/push (realtime IMAP) — kräver långlivad worker, inte edge-function-vänligt. Cron var 10:e min räcker för v1.
- Stöd för IMAP-konton helt utan SMTP-sändning (vi har ingen användarflöde för det idag).

## Resultat efter detta
- Reply-stop fungerar för **alla** kontotyper i appen (Gmail OAuth, Outlook OAuth, SMTP+IMAP).
- Sista P0-risken från förra genomgången är borta.
- Vi kan slå på SMTP för riktiga användare med gott samvete.

Vill du att jag bygger detta nu?
