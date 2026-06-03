## Snabb bedömning: påverkar säkerhetsfixarna funktionaliteten?

Kort svar: **nej, ingen användarvisuell funktion bör vara påverkad** — men det finns 1–2 saker värda att verifiera. Här är genomgång per ändring:

### 1. `dsr_requests` → RESTRICTIVE-policies
- Klienten hade redan ingen åtkomst (PERMISSIVE `false`). RESTRICTIVE `false` är funktionellt identiskt mot ingen åtkomst.
- DSR-flödet går via edge function `submit-dsr` med `service_role` som bypassar RLS.
- **Påverkan: ingen.**

### 2. RLS på `realtime.messages` (endast `postgres_changes`)
- Appen använder bara `postgres_changes` i: `useCreditBalance`, `useInbound`, `useInbox`, `VerifyInstallDialog`. Alla matchar policyn.
- Ingen broadcast/presence från klienten används idag.
- Notera: Supabase Realtime postgres_changes går via logisk replikering och respekterar fortfarande tabell-RLS — så även om policyn på realtime.messages är restriktiv så fungerar prenumerationerna.
- **Påverkan: ingen idag.** Om vi i framtiden vill använda broadcast/presence behöver vi lägga till en policy då.

### 3. Allowlist på `returnUrl` i `create-credit-checkout`
- Klienten skickar `${window.location.origin}/leads/credits/return?...`.
- Produktion: `https://maillead.ai` / `https://www.maillead.ai` → tillåtet.
- Preview: `https://id-preview--…lovable.app` → matchar `.lovable.app`-suffix → tillåtet.
- **Påverkan: ingen i produktion eller preview.** Risk endast vid lokal `localhost:5173` (Stripe används normalt inte lokalt).

### 4. SSRF-guard för SMTP/IMAP-host
- Validerar att host inte är `localhost`, `.local`, `.internal`, privat IP, loopback, link-local, CGNAT eller multicast — varken som literal eller efter DNS-resolve.
- Vanliga publika SMTP-hosts (Gmail, Outlook 365, SendGrid, Mailgun, eget mailserver med publik A-record) resolverar till publika IPs → tillåts.
- **Möjlig falsk positiv:** om en användares mailserver pekar mot en intern hostname (väldigt ovanligt för SMTP-relay) eller om DNS-resolvern i edge function tillfälligt failar (returnerar "dns resolution failed"). Bedöms som mycket låg risk.

### Vad jag rekommenderar att verifiera i preview
1. Testa att starta ett kredit-checkout (preview-URL går genom Stripe).
2. Bekräfta att inbox/credit-saldo uppdateras i realtid när nytt mail kommer in eller krediter ändras.
3. Om det finns ett SMTP-konto kopplat: trigga "testa anslutning" igen för att se att guardiet inte avvisar det.

### Tekniska detaljer
- `realtime.messages`-policyn är "SELECT FOR authenticated USING extension = 'postgres_changes'". Det är en SELECT-policy som styr läsning av broadcast/presence-meddelanden i realtime-systemet, inte postgres_changes-strömmen.
- Allowlist-suffix `.lovable.app` och `.lovableproject.com` täcker både preview- och published-domäner.
- SSRF-guarden använder `Deno.resolveDns` (A + AAAA) parallellt och tillåter värden där alla returnerade IPs är publika.

Inga kodändringar föreslås — detta är en konsekvensanalys.
