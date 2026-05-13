# Test-funktioner för kampanjer

Två nya funktioner i Sekvens-fliken så du kan validera mejl innan utskick:

1. **Förhandsvisa som riktigt lead** – välj ett lead från sekvensen och se mejlet renderat med dess variabler.
2. **Skicka testmejl** – skicka det aktuella steget till valfri mejladress (förifyllt med din inloggade adress), valfritt med ett valt lead som variabelkälla.

## 1. Lead-väljare i förhandsvisningen

I `EmailPreview` (höger sidopanel i `SequenceTab`):
- Lägg till en `Select` överst i kortet: "Förhandsvisa som …" med alla leads i sekvensen + "Exempeldata".
- Default = första lead om det finns, annars exempeldata.
- Visar en liten varningsbadge om valt lead saknar t.ex. `first_name` eller `company` (så man ser vilka variabler som blir tomma).

## 2. "Skicka testmejl"-knapp

Ny knapp bredvid "Skriv med AI" i `SequenceTab`-headern: **"Skicka test"**.

Öppnar en dialog (`SendTestEmailDialog`) med:
- **Avsändarkonto** – Select med kampanjens kopplade `sequence_senders` (default = första).
- **Till** – e-postfält, förifyllt med inloggad användares e-post.
- **Variabler från lead** – Select: "Exempeldata" eller något av sekvensens leads.
- **Steg** – Select: vilket steg i sekvensen som ska skickas (default = aktuellt valt).
- Förhandsvisning av rendered subject + body innan man skickar.
- Knapp: **Skicka test**.

Vid klick anropas befintlig edge-funktion `send-email` med:
- `email_account_id` = valt avsändarkonto
- `to` = angiven adress
- `subject` / `body_html` = renderade via `renderTemplate` med vald lead/exempeldata + sender-info
- **Inget** `lead_id` eller `sequence_id` skickas → loggas inte som kampanjmejl, ingen `scheduled_sends`-rad, inget tråd-uppdatering kopplat till lead.
- Subject prefixas med `[TEST] ` så det syns i inkorgen.

Toast vid svar: "Test skickat till …" eller felmeddelande från servern (samma decrypt/oauth-fel som i prod, så du kan felsöka avsändarkonton här).

## Tekniska detaljer

**Nya/ändrade filer:**
- `src/components/sequence/EmailPreview.tsx` – ny `leadOptions`-prop + intern `Select` för lead-val.
- `src/components/campaign/SequenceTab.tsx` – "Skicka test"-knapp + state för valt preview-lead, skickas ner till `EmailPreview`.
- `src/components/campaign/SendTestEmailDialog.tsx` – ny dialog (avsändare/till/lead/steg + preview + skicka).
- `src/hooks/useEmailAccounts.ts` – återanvänds för avsändarlistan; ev. liten hook `useSequenceSenders(sequenceId)` om den inte redan finns (annars query inline).

**Ingen backend-ändring behövs** – `send-email` accepterar redan `to`/`subject`/`body_html` utan `lead_id`/`sequence_id`, och RLS skyddar redan `email_account_id` mot user_id.

**Inte med i denna iteration:**
- Bulk-test till flera adresser
- Spara senast använd test-adress
- Testutskick av hela sekvensen i ett svep (bara ett steg åt gången)
