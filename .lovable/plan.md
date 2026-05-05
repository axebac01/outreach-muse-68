## Mål
Lägg till en "Generera kampanj med AI"-funktion i sequence builder. Användaren beskriver målet med kampanjen (t.ex. "erbjuda partnerskap till IT-konsulter") och får tillbaka en komplett mejlsekvens — alla steg med ämne, brödtext, väntedagar och korrekt användning av variabler.

## UX-flöde

1. På `StepSequence`-sidan (`/sequence/:id/sequence`) lägger jag till en knapp **"Generera med AI"** högst upp bredvid "Continue".
2. Klick öppnar en dialog med:
   - Textarea: "Vad vill du åstadkomma med kampanjen?" (t.ex. "Erbjuda partnerskap till IT-konsulter").
   - Litet val för antal steg (3 / 4 / 5, default 4).
   - Litet val för tonalitet (default = bolagets `company_tone` om finns, annars "professionell men personlig").
   - Knapp **"Generera"** med inline-loader (samma stil som onboarding-loadern, fast mindre).
3. När AI:n svarar:
   - Om det redan finns icke-tomma steg, visa bekräftelse "Detta ersätter befintliga steg" innan vi skriver över.
   - Annars: spara stegen direkt och stäng dialogen, toast "Kampanj skapad".

## Data till AI:n

Edge function `generate-sequence` hämtar serverside (med användarens JWT):
- `profiles`: `company_name`, `company_description`, `company_target_audience`, `company_value_prop`, `company_industry`, `company_tone`, `company_key_offerings`, `company_pain_points`, `company_proof_points`. Det här är "vem säljaren är".
- `sequence_leads` för aktuell `sequence_id`: ta upp till 20 leads och plocka ut distinkta `company`, `role`, ev. `full_name`-mönster. Skicka även 3 exempel-leads (anonymiserade) som mall för hur variablerna ska användas.
- Listan av tillåtna variabler från `VARIABLE_DEFS` (`first_name`, `company`, `sender_name`, `unsubscribe`, etc.) — AI:n får instruktion att bara använda dessa och alltid inkludera `{{unsubscribe}}` i sista steget.

Användaren skickar med:
- `sequence_id`
- `goal` (fritext)
- `step_count`
- `tone`

## AI-anrop

- Edge function: `supabase/functions/generate-sequence/index.ts`.
- Modell: `google/gemini-3-flash-preview` via Lovable AI Gateway.
- Använder tool calling (`generate_sequence`) för strukturerad output:
  ```
  {
    steps: [
      { step_order: number, subject: string, body: string, wait_days: number }
    ]
  }
  ```
- System-prompt ger AI:n personan "expert på kalla mejl och svenska säljkampanjer", instruerar:
  - Skriv på svenska som default (samma språk som `company_description`).
  - Personliga, korta mejl (max ~120 ord per steg). Steg 1 = hook + value, mellansteg = follow-up med ny vinkel/proof, sista = mjuk break-up.
  - Använd variabler `{{first_name}}`, `{{company}}`, `{{sender_name}}` etc. där det är naturligt.
  - Använd ENBART variabler från en angiven vit lista.
  - Steg 1 har `wait_days: 0`. Följande steg 2–4 dagar.
  - Sista stegets body måste innehålla `{{unsubscribe}}`.
  - Inga "Hi {first}" placeholders eller hashtaggar — bara variabel-syntaxen `{{...}}`.
- Felhantering: 429 → toast "AI är upptagen, försök igen", 402 → "Slut på AI-credits".

## Spara stegen

- Edge function returnerar bara JSON till klienten — den gör inte DB-skrivningarna själv (då behöver vi inte service role för det här).
- Frontend tar svaret och:
  1. Tar bort befintliga `sequence_steps` för sekvensen (om man bekräftat overwrite).
  2. Insert nya rader via befintlig supabase-klient (RLS skyddar).
  3. Invalidate `sequence_steps`-query så UI:t ritar om.

## Filer som ändras / skapas

- **Ny**: `supabase/functions/generate-sequence/index.ts` (validerar JWT, läser profile + leads, anropar AI gateway, returnerar steg-array).
- **Ny**: `src/components/sequence/GenerateSequenceDialog.tsx` (UI: textarea, val, generera-knapp, loader, fel-handling).
- **Ny**: `src/hooks/useGenerateSequence.ts` (mutation: anropa edge function + skriv över steg).
- **Edit**: `src/pages/sequence/StepSequence.tsx` — lägg till "Generera med AI"-knappen som öppnar dialogen.
- **Edit**: `src/i18n/locales/sv.json` + `en.json` — nya strängar.

## Edge cases

- Om `profiles.company_description` saknas helt: edge function returnerar 400 "Slutför onboardingen först" och dialogen visar det.
- Om sekvensen inte har några leads än: vi kör ändå, men AI:n får en notis "inga konkreta leads — gör mejlen generella mot målgruppen X".
- Om AI:n bryter mot variabel-vita listan: vi gör en server-side post-process som strippar `{{...}}` som inte finns i listan, så ingen `{{ogiltig}}`-token läcker ut.

## Tekniska detaljer

- Gateway-anrop följer befintligt mönster i `analyze-company` (samma auth/CORS).
- Tool schema: `additionalProperties: false`, alla fält required, så Gemini följer formatet stabilt.
- Ingen ny DB-migration behövs — vi återanvänder `sequence_steps`.
- Loader-komponenten i dialogen återanvänder samma "rotating dots + cycling status text"-stil som onboarding-loadern, fast i mindre format.

## Vad jag verifierar efteråt
- Generera kampanj på en tom sekvens → 4 steg dyker upp med fyllda subject/body, korrekt `wait_days`, `{{first_name}}` används.
- Generera på en sekvens med befintliga steg → bekräftelse innan overwrite.
- Saknad onboarding → tydligt felmeddelande.
- Variabler renderas korrekt i `EmailPreview` med första leaden.