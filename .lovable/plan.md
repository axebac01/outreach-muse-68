# Integration: Importera leads från Company Intel Hub

Vi bygger en enkel **API-key-baserad** integration. Den här appen (outreach) exponerar en publik edge function som tar emot leads. Den andra appen (Company Intel Hub) skickar leads dit via en knapp "Skicka till Outreach".

Två separata jobb: först bygger vi mottagarsidan här. Sen får du en färdig prompt att klistra in i det andra projektet.

---

## Del 1 – Vad vi bygger i DENNA app

### 1. Databas
Ny tabell `integration_api_keys`:
- `id`, `user_id` (FK auth.users), `name` (t.ex. "Company Intel Hub"), `key_hash` (sha256 av nyckeln, vi visar råa nyckeln endast vid skapande), `key_prefix` (första 8 tecknen för identifiering i UI), `last_used_at`, `created_at`, `revoked_at`.
- RLS: bara ägaren får se/radera sina egna nycklar.

Ny tabell `lead_import_log` (valfritt men nyttigt för felsökning):
- `id`, `user_id`, `api_key_id`, `source` (text, t.ex. "company-intel-hub"), `payload_count`, `inserted_count`, `skipped_count`, `target_type` ('sequence' | 'campaign' | 'inbox-only'), `target_id`, `created_at`.

### 2. Edge function `import-leads` (publik, ingen JWT)
- Endpoint: `POST https://<project>.supabase.co/functions/v1/import-leads`
- Headers: `Authorization: Bearer <api_key>`, `Content-Type: application/json`
- Body:
  ```json
  {
    "source": "company-intel-hub",
    "target": { "type": "sequence" | "campaign" | "none", "id": "<uuid eller null>" },
    "leads": [
      {
        "email": "info@acme.com",
        "full_name": "Anna Andersson",
        "first_name": "Anna",
        "last_name": "Andersson",
        "company": "Acme AB",
        "role": "Marketing Director",
        "phone": "+46...",
        "website": "https://acme.com",
        "linkedin_url": "https://linkedin.com/in/...",
        "notes": "Hittad via Industrikampanj v2"
      }
    ]
  }
  ```
- Logik:
  1. Hasha inkommande nyckel (sha256), slå upp `integration_api_keys` där `key_hash = X` och `revoked_at IS NULL`.
  2. Validera body med Zod (`leads` max 1000 per request, e-post regex).
  3. Om `target.type === "sequence"`: insert i `sequence_leads` (de-dup på `(sequence_id, email)`).
  4. Om `target.type === "campaign"`: insert i `leads` med `campaign_id`.
  5. Om `target.type === "none"`: insert som "unassigned" leads — vi lägger dem i en standard-sekvens som heter "Inbox – Imported" (skapas automatiskt om saknas) så de syns i Unibox.
  6. Returnera `{ ok, inserted, skipped, target }`.
  7. Logga till `lead_import_log` och uppdatera `last_used_at`.

### 3. UI i denna app
- **Settings → Integrations**: lista nycklar, knapp "Skapa API-nyckel" (modal visar nyckeln **en gång** + kopieringsknapp), revoke-knapp.
- I modalen: visa endpoint-URL + minimalt curl-exempel + en knapp "Kopiera prompt för Company Intel Hub" som kopierar prompten i Del 2 (med URL och nyckel inflickade).
- **Importer-väljare** (valfri förbättring): instruktion "Tipsa avsändaren att sätta `target.type` + ID från denna sequence/campaign". På sequence- och campaign-detaljsidan: en liten "Import-mottagare"-info-ruta som visar URL + sequence/campaign ID.

### 4. Säkerhet
- Nycklarna lagras endast hashat (SHA-256). Vi kan inte visa dem igen efter skapande.
- Edge function har `verify_jwt = false` (API-nyckel-auth i kod istället).
- Rate limit: enkel in-memory-räknare per nyckel (60 requests/min) som varning.
- RLS säkerställer att en nyckel bara kan skriva data för sin ägare.

---

## Del 2 – Prompt att klistra in i Company Intel Hub

När Del 1 är klar får du en API-nyckel + URL. Då skriver du följande prompt i Company Intel Hub-projektet:

> ```
> Lägg till en "Skicka till Outreach"-integration så jag kan exportera utvalda contacts/companies som leads till min andra Lovable-app.
>
> 1. Settings → Integrations: ny sektion "Outreach". Två fält som sparas i en ny tabell `outreach_integration_settings` (en rad per user_id):
>    - `endpoint_url` (text)
>    - `api_key` (text, lagras krypterat med pgp_sym_encrypt om möjligt, annars i en Supabase secret OUTREACH_API_KEY)
>    - `default_target_type` ('sequence' | 'campaign' | 'none')
>    - `default_target_id` (text)
>    En "Testa anslutning"-knapp som POSTar `{ "source":"company-intel-hub", "target":{"type":"none"}, "leads":[] }` och visar OK/fel.
>
> 2. På Companies-sidan, Contacts-sidan, People-sidan och ImportDetail-sidan: lägg till bulk-action "Skicka till Outreach" på markerade rader. Knappen öppnar en dialog där användaren kan:
>    - välja target (sequence/campaign/none) — override mot default
>    - se preview på antalet leads som kommer skickas
>    - bekräfta
>
> 3. Skapa en ny edge function `send-to-outreach` som:
>    - tar emot `{ ids: string[], source_table: 'companies'|'contacts'|'contact_people', target: {...} }`
>    - validerar JWT
>    - läser ut motsvarande rader, mappar till outreach-format:
>      - från `contacts` (generic_email): `{ email: c.value, company: company.name, website: company.website, notes: 'Generic email from ' + company.name }`
>      - från `contact_people`: `{ full_name, first_name (split), last_name, role: role_title, company: company.name, website: company.website }` (skippa rader utan email om mottagaren kräver email)
>      - från `companies`: hämta första generic email per bolag
>    - POSTar batchat (max 500 per request) till outreach-endpoint med `Authorization: Bearer <api_key>` från settings/secret
>    - returnerar `{ inserted, skipped, errors[] }` och visar toast i UI
>    - loggar i ny tabell `outreach_send_log` (user_id, count, target, response, created_at)
>
> 4. Outreach API-format (det som ska POSTas):
>    ```
>    POST <endpoint_url>
>    Authorization: Bearer <api_key>
>    Content-Type: application/json
>    {
>      "source": "company-intel-hub",
>      "target": { "type": "sequence" | "campaign" | "none", "id": "<uuid eller null>" },
>      "leads": [
>        { "email": "...", "full_name": "...", "first_name": "...", "last_name": "...",
>          "company": "...", "role": "...", "phone": "...", "website": "...",
>          "linkedin_url": "...", "notes": "..." }
>      ]
>    }
>    ```
>    Skippa rader utan giltig email. Maxa 500 leads per request — chunka om fler.
>
> 5. Lägg till en kolumn "Skickad till Outreach" (timestamp) på contacts/contact_people så vi inte skickar dubbletter.
> ```

(När prompten skickas in i andra projektet kommer Lovable-agenten där att be om endpoint-URL och API-nyckel — det är de värden du fick av oss i steg 1.)

---

## Tekniska detaljer (denna app)

- `supabase/functions/import-leads/index.ts` – ny.
- `supabase/migrations/<ts>_integration_api_keys.sql` – två nya tabeller + RLS.
- `src/pages/Settings.tsx` – ny tab/section "Integrations".
- `src/components/CreateApiKeyDialog.tsx` – modal med one-time-display.
- `src/hooks/useIntegrations.ts` – CRUD för API-nycklar.
- `supabase/config.toml` – `[functions.import-leads] verify_jwt = false`.

Inga ändringar behövs i befintliga import/lead-tabeller.
