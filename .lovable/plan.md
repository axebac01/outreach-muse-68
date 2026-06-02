
# Mål

Unibox ska endast visa mejl som är relaterade till MailLead-aktivitet: svar på utskick, eller mejl från/till en adress som finns som lead hos användaren. Allt annat (nyhetsbrev, fakturor, interna mejl) filtreras bort. En toggle "Visa alla mejl" finns för power users.

## Definition av "relaterat"

Ett `email_messages`-rad anses MailLead-relaterat om något av följande gäller:
1. `sequence_id IS NOT NULL` (svar matchat via References/In-Reply-To till ett utskick).
2. `lead_id IS NOT NULL` (avsändaradressen finns i `sequence_leads` för användaren).
3. Mejlet är `direction='outbound'` skickat av MailLead (alltid relevant).
4. Tråden (`thread_key` + `email_account_id`) innehåller minst ett av ovanstående.

Punkt 4 är viktig: om leaden svarar från en sidoadress eller forwardar internt så att en ny person går in i tråden, ska resten av tråden fortfarande synas.

---

## Tekniska steg

### 1. Databas — ny kolumn + backfill (migration)

- Lägg till `is_lead_related BOOLEAN NOT NULL DEFAULT false` på både `email_messages` och `email_threads`.
- Index: `CREATE INDEX ON email_threads (user_id, is_lead_related, last_message_at DESC) WHERE is_archived = false;`
- Backfill:
  - Markera `email_messages.is_lead_related = true` där `lead_id IS NOT NULL` ELLER `sequence_id IS NOT NULL` ELLER `direction='outbound'`.
  - Markera `email_threads.is_lead_related = true` om någon meddelandet i tråden uppfyller kriterierna (subquery per thread_key + email_account_id).

### 2. `sync-inbox/index.ts` — sätt flaggan vid insert

I `persistInbound`:
- Beräkna `isLeadRelated = !!leadId || !!sequenceId`.
- Om false: gör en till lookup — kolla om någon adress i `To`/`Cc` finns i `sequence_leads` (för forwardade fall). Sätt även då.
- Skicka `is_lead_related` i insert.
- Efter trådupsert: om nya meddelandet är lead-related ELLER tråden redan är det, sätt `is_lead_related=true` på tråden. Annars behåll false.
- AI-analysen (`analyze-inbound-email`) triggas **endast om** `is_lead_related === true`. Sparar credits och undviker nonsens-etiketter på nyhetsbrev.

### 3. `send-email/index.ts` — outbound markeras alltid

När MailLead själv skickar mejl: sätt `is_lead_related = true` på både `email_messages` och `email_threads` (tråden skapas/uppdateras vid outbound också).

### 4. Frontend

**`src/hooks/useInbox.ts`**
- `useInboxThreads(filters)`: lägg till `showAll?: boolean` i filters. Default false → `.eq("is_lead_related", true)`.
- `useUnreadInboxCount`: filtrera på `is_lead_related=true` (annars blir badge missvisande).

**`src/pages/Inbox.tsx`**
- Ny toggle/switch i toolbar: "Visa alla mejl" (av som default). Persisteras i localStorage.
- När av: visa endast lead-relaterade. När på: visa allt (men markera icke-lead-trådar visuellt med en discreet "Ej kopplad till lead"-badge).
- Tom-state-text uppdateras: "Inga svar från dina kampanjer ännu. När en lead svarar dyker det upp här."

### 5. Retroaktiv "uppgradering" av trådar

Om en användare lägger till en lead vars adress redan finns i en befintlig tråd, ska tråden bli synlig i Unibox. Lösning:
- Lägg till en trigger på `sequence_leads` (AFTER INSERT): uppdatera `email_threads` där `participants @> ARRAY[NEW.email]` och `user_id = NEW.user_id` → sätt `is_lead_related=true` och `lead_id=NEW.id` om null. Samma för matchande `email_messages`.

### 6. Inbox-räknare och realtime
- `useInboxRealtime` är redan trådsbaserad — fungerar utan ändring eftersom flaggan ligger på tråden.
- Badge i sidomenyn (om finns) ska bara räkna lead-related olästa.

---

## Vad ändras inte

- `sync-inbox` syncar fortfarande alla inbox-mejl från Gmail/Outlook (vi behöver dem för att kunna matcha framtida leads). Vi *filtrerar*, vi *blockerar inte hämtning*.
- Bounce-detektion, reply-pause-logik, scheduled_sends cancellation: oförändrad.
- `email_messages`-tabellens RLS och struktur i övrigt: oförändrad.

---

## Filer som berörs

- Migration: ny kolumn + index + backfill + trigger
- `supabase/functions/sync-inbox/index.ts` — sätt flaggan, betinga AI-trigger
- `supabase/functions/send-email/index.ts` — sätt flaggan för outbound
- `src/hooks/useInbox.ts` — filtrering + showAll
- `src/pages/Inbox.tsx` — toggle + tom-state + badge för icke-lead
- (Ev.) `src/i18n/locales/{sv,en}.json` — nya strängar

---

## Risker & öppna frågor

- **Aliases/plus-addressing**: `firstname+tag@domain.com` matchar inte `ilike("email", from)`. Vi behåller dagens enkla match; kan förbättras separat om problem uppstår.
- **Stora trådar**: backfill-subquery kan vara tung. Vi kör den en gång under migration — acceptabelt.
- **Användare som redan vant sig vid att se allt**: visa en engångs-toast första gången Inbox laddas efter deploy som förklarar filtreringen och pekar på toggeln.

---

## Verifiering efter implementation

1. Skicka kampanjmejl → leaden svarar → svaret syns i Unibox. ✅
2. Få ett nyhetsbrev till samma adress → syns INTE i Unibox (men finns i Gmail). ✅
3. Slå på "Visa alla" → nyhetsbrevet syns med "Ej kopplad till lead"-badge. ✅
4. Lägg till en lead vars adress finns i tidigare tråd → tråden dyker upp i Unibox. ✅
5. AI-analys körs bara på lead-related inbound (kolla `analyze-inbound-email`-loggar). ✅
