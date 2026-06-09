# UX-fixar för onboarding & signup

Vi tar de tre kvarvarande punkterna från listan (punkt 4 är redan löst). Ordning: enklast först, mest UI-arbete sist.

## 1. Hoppa över namnsteget i onboardingen om namnet redan finns

**Problem:** Användaren fyller i namn vid signup, sen frågar onboardingen samma sak igen.

**Lösning i `src/pages/Onboarding.tsx`:**
- Vid mount, läs `profile.full_name` (vi hämtar redan profilen för hydrering av scrape-state — utöka samma query).
- Om `full_name` finns och är icke-tomt:
  - Sätt `answers.name = full_name` i state och localStorage.
  - Filtrera bort `name`-steget från `steps`-arrayen (gör `steps` till en `useMemo` som returnerar listan utan `name`-steget när namnet är förifyllt).
- Effekten: användaren landar direkt på URL-steget. Vid submit används redan `answers.name` så `full_name` skrivs ändå till `profiles` (no-op om samma värde).

Inget behov av att röra databasen — `full_name` sätts redan via `options.data` vid `supabase.auth.signUp` och triggern lägger den i `profiles`.

## 2. Tydlig "verifiera din mejl"-skärm efter signup

**Problem:** Efter signup landar man på inloggningsskärmen utan tydligt meddelande om att bekräftelsemejl skickats. Toast räcker inte.

**Lösning:**
- Ny komponent/sida `src/pages/VerifyEmail.tsx` (eller en `?verify=1`-state på Signup-sidan). Förslag: separat route `/verify-email` som tar emot `?email=...` query.
- Innehåll:
  - Stor ikon (Mail), rubrik "Kolla din inkorg", text "Vi har skickat ett bekräftelsemejl till **{email}**. Klicka på länken för att aktivera kontot."
  - Två knappar: "Öppna Gmail" (länk `https://mail.google.com`), "Skicka igen" (kallar `supabase.auth.resend({ type: 'signup', email })` med 60 s cooldown).
  - Liten text: "Hittar du inte mejlet? Kolla skräpposten."
- `Signup.tsx`: efter lyckad `signUp` → `navigate('/verify-email?email=' + encodeURIComponent(email))` istället för `/onboarding`.
- Lägg till route i `App.tsx` under `PublicOnlyRoute`.
- Översättningar i `sv.json`/`en.json` under `auth.verify.*`.

Note: Vi rör inte auto-confirm-inställningen i Supabase. Mejlbekräftelse är redan på.

## 3. Lösenordskrav + bekräfta lösenord

**Problem:** Inget krav på lösenordsstyrka, ingen bekräftelse — ovanligt för en SaaS-produkt.

**Lösning i `src/pages/Signup.tsx`:**
- Lägg till `confirmPassword`-fält direkt under `password`-fältet.
- Definiera regler (visas som live-checklista under password-fältet med ✓/○):
  - Minst 8 tecken
  - Minst en stor bokstav
  - Minst en siffra
- Validering via zod-schema (vi har redan zod i projektet):
  ```ts
  const passwordSchema = z.string()
    .min(8, "Minst 8 tecken")
    .regex(/[A-Z]/, "Minst en stor bokstav")
    .regex(/[0-9]/, "Minst en siffra");
  const signupSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine(d => d.password === d.confirmPassword, {
    message: "Lösenorden matchar inte",
    path: ["confirmPassword"],
  });
  ```
- Liten `PasswordChecklist`-komponent (inline i Signup.tsx, ingen separat fil) som visar reglerna och bockar av live medan användaren skriver.
- Submit-knapp disabled tills schema passerar.
- Använd `react-hook-form` eller enkel `useState` + manuell validering — vi väljer det enklare: manuell validering eftersom Signup-formuläret är litet.

Aktivera HIBP (Have I Been Pwned) lösenordskontroll i Supabase auth-config. Använder `supabase--configure_auth` med `password_hibp_enabled: true`. Om ett läckt lösenord används får användaren tydligt fel från `supabase.auth.signUp` som vi översätter i `errorMessages.ts`.

## Tekniska detaljer

**Filer som ändras:**
- `src/pages/Onboarding.tsx` — punkt 1 (steps-filtrering + förfyll namn)
- `src/pages/Signup.tsx` — punkt 3 (lösenordsregler, bekräfta) + punkt 2 (navigera till /verify-email)
- `src/pages/VerifyEmail.tsx` — ny (punkt 2)
- `src/App.tsx` — ny route (punkt 2)
- `src/i18n/locales/sv.json` + `en.json` — nya nycklar för verify + password-rules
- `src/lib/errorMessages.ts` — mappa eventuellt HIBP-fel

**Backend:**
- `supabase--configure_auth` med `password_hibp_enabled: true`. Inga andra ändringar.

## Verifiering

1. **Punkt 1:** Skapa nytt konto med namn → onboarding visar URL-steget direkt, inte namn-steget. `profiles.full_name` är fortfarande korrekt efter submit.
2. **Punkt 2:** Efter signup → landar på /verify-email med rätt email visad → "Skicka igen" funkar och har 60 s cooldown → länk i mejl tar till app.
3. **Punkt 3:** Försök svaga lösenord → submit disabled + checklist tydlig. Olika lösenord i bekräfta → felmeddelande. Läckt lösenord (`password123`) → tydligt fel från HIBP.

## Ordning vid implementation

Bygger i ordning 1 → 2 → 3 (snabbast vinst först, mest UI-arbete sist). Säg till om du vill ta dem en i taget istället för alla i samma omgång.
