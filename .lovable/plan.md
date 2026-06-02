## Regel att komma ihåg

Vi förbereder för launch. Inga halvfärdiga features får läggas in i appen. Allt som syns för användaren ska antingen:
1. Vara fullt funktionellt, eller
2. Vara tydligt markerat som "Kommer snart" (som Inbound-sidan)

Innan något byggs ska det finnas en plan som godkänns.

Jag sparar detta som en core-regel i projektminnet (`mem://index.md`) så fort vi går till build mode.

---

## Förslag: gör "Notifiera mig vid lansering" på riktigt

Just nu visar knappen bara en toast utan att spara något. Det är exakt en sån halvfärdig grej vi vill undvika inför launch. Jag föreslår att vi gör den klar nu.

### Vad som byggs

**Databas**
- Ny tabell `public.launch_interest`:
  - `id uuid pk default gen_random_uuid()`
  - `email text not null`
  - `feature text not null` (t.ex. `'inbound'` — så vi kan återanvända tabellen för andra "Kommer snart"-sidor)
  - `created_at timestamptz default now()`
  - `user_id uuid null` (sätts om användaren är inloggad)
  - Unik på `(email, feature)` så samma person inte dubbelregistreras
- GRANTs: `INSERT` för `anon` och `authenticated`, `ALL` för `service_role`. Ingen SELECT för anon/authenticated (listan är privat).
- RLS på, policy som tillåter `INSERT` för alla (anon + authenticated). Ingen SELECT-policy = ingen kan läsa från klienten.

**Frontend (`src/pages/Inbound.tsx`)**
- "Notifiera mig vid lansering" öppnar en liten inline-form (eller dialog) med ett e-postfält.
- Vid submit: validera e-post, skriv till `launch_interest` med `feature: 'inbound'`.
- Om inloggad: förifyll med användarens e-post och sätt `user_id`.
- Hantera duplicate-fel snyggt ("Du står redan på listan").
- Toast vid success: "Tack! Vi hör av oss så snart Inbound släpps."
- Loading-state på knappen.

**Inget annat** — ingen edge function, ingen e-postutskick, ingen admin-vy. Det kan komma senare. Det här är fullt funktionellt för sitt syfte: samla intresseanmälningar.

### Verifiering
- Skicka in en e-post → rad i `launch_interest`.
- Skicka in samma igen → vänligt felmeddelande, ingen dubblett.
- Ogiltig e-post → valideringsfel innan request.
