# Plan: Variabler, signaturer och unsubscribe

## 1. Databas

**Ny migration:**
- `email_accounts`: lägg till kolumn `signature text` (HTML/text-signatur per ansluten avsändaradress) och `sender_name text` (visningsnamn).
- Ny tabell `unsubscribes`:
  - `id uuid pk`, `user_id uuid not null`, `email text not null` (lowercase), `sequence_id uuid nullable`, `created_at timestamptz default now()`
  - Unik på (`user_id`, `email`)
  - RLS: användare ser/raderar bara egna rader. Insert tillåts även för publika via service role från edge function.

## 2. Variabelsystem (`src/lib/renderTemplate.ts`)

Utöka `LeadVars` → `RenderVars` med fält för avsändare och unsubscribe-länk. Nya variabler:

- **Lead**: `first_name`, `last_name`, `full_name`, `company`, `role`, `email`, `phone` (befintliga)
- **Avsändare**: `sender_name`, `sender_email`, `sender_signature`
- **System**: `unsubscribe` (renderas som `<a href="...">Unsubscribe</a>` när länk finns, annars tom)

Gruppera i `AVAILABLE_VARIABLES` som `{ group: "lead" | "sender" | "system", key, label }` så UI kan rendera grupperade badges.

## 3. UI

**`src/components/sequence/SequenceStepCard.tsx`:**
- Gruppera variabel-badges i tre rader (Lead / Avsändare / System) med små rubriker.
- Varning under body om mejlet saknar `{{unsubscribe}}` (gult Alert).

**`src/components/sequence/EmailPreview.tsx`:**
- Skicka in dummy-värden för avsändarvariabler och en `#` unsubscribe-länk för förhandsvisning.

**`src/pages/EmailAccounts.tsx`:**
- Lägg till "Redigera signatur"-knapp/dialog per mejlkonto med fälten `sender_name` och `signature` (Textarea).
- Spara via uppdatering på `email_accounts`.

## 4. Unsubscribe edge function

Ny `supabase/functions/unsubscribe/index.ts` (publik, ingen JWT-check):
- GET `?t=<token>` där token = base64url(`user_id:email`) + HMAC (signerad med `EMAIL_TOKEN_ENCRYPTION_KEY` som redan finns).
- Verifierar HMAC, slår upp/insertar i `unsubscribes` via service role.
- Returnerar enkel HTML-bekräftelsesida (svensk + engelsk text).
- POST samma path → används för `List-Unsubscribe-Post` (one-click).

Helper `supabase/functions/_shared/unsubscribe.ts`:
- `signUnsubscribeToken(userId, email)` → token-sträng
- `verifyUnsubscribeToken(token)` → `{ userId, email } | null`
- `buildUnsubscribeUrl(userId, email)` → full URL till edge function

## 5. Sändningsflödet

**`supabase/functions/launch-sequence/index.ts`:**
- Innan en lead schemaläggs: kolla `unsubscribes` för (`user_id`, `lower(email)`). Om finns → hoppa över / sätt status `unsubscribed`.

**`supabase/functions/send-email/index.ts`:**
- Samma kontroll precis innan send (säkerhetsnät).
- Hämta `signature` + `sender_name` från `email_accounts`.
- Bygg `RenderVars` med avsändardata + `unsubscribe`-URL via helper.
- Rendera subject + body via samma `renderTemplate` (porta logiken till en delad helper i `_shared/renderTemplate.ts` så frontend och edge function ger identiskt resultat).
- Lägg till headers:
  - `List-Unsubscribe: <mailto:unsub@...>, <https://.../functions/v1/unsubscribe?t=...>`
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- Sätt `From`-namn från `sender_name` om satt.
- Auto-append: om body saknar `{{unsubscribe}}` och inte innehåller "unsubscribe"-länk → lägg automatiskt till en liten footer "Unsubscribe" i botten.

## 6. Tekniska detaljer

- HMAC: `crypto.subtle` + `EMAIL_TOKEN_ENCRYPTION_KEY` (SHA-256, hex-trunc 16 bytes).
- Token-format: `base64url(payload).hex(hmac)` där payload = `${userId}|${email}`.
- `supabase/config.toml`: lägg till `[functions.unsubscribe] verify_jwt = false`.
- Delad render-logik: ny `supabase/functions/_shared/renderTemplate.ts` (Deno-kompatibel kopia av frontend-versionen, exporterar samma funktion).

## 7. i18n

Lägg till svenska + engelska strängar för:
- Variabel-grupprubriker
- Varning "Mejlet saknar avregistreringslänk"
- Signatur-dialog i EmailAccounts
- Unsubscribe-bekräftelsesidan (i edge function, hårdkodat båda språk)

## Att inte göra nu
- Open/click tracking (egen sprint senare)
- Bounce-hantering (egen sprint)
- Custom unsubscribe-landningssida i appen (edge function returnerar HTML direkt räcker)
