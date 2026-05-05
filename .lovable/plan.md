# Användarvänlig datum-/tidsväljare i Schema-steget

Ersätt den nuvarande `<input type="datetime-local">` på `Kampanj → Schema → Starta` (`src/pages/sequence/StepSchedule.tsx`) med en kombinerad **kalender-popover + tidsväljare**, så användaren kan klicka sig fram visuellt i stället för att skriva `åååå-mm-dd --:--`.

## UI

I "Starta"-kortet, ersätt det enda fältet med två sida-vid-sida-kontroller (samma rad, `grid sm:grid-cols-[1fr_140px] gap-2`):

1. **Datumknapp** — `Button variant="outline"` med `CalendarIcon` + lokaliserat datum (`format(date, "PPP", { locale: sv|enUS })`) eller placeholder "Välj datum". Öppnar `Popover` som innehåller shadcn `Calendar` (`mode="single"`, `disabled={d => d < today}`, `initialFocus`, `className="p-3 pointer-events-auto"`, `locale={sv|enUS}`, `weekStartsOn={1}`).
2. **Tidsfält** — `Input type="time"` (steg 5 min) med samma höjd som knappen. Defaultar till `09:00` om inget satt.

Snabbgenvägar under fälten: tre små chip-knappar — "Idag", "Imorgon", "Nästa måndag" — som sätter datumet i ett klick. En liten "Rensa"-länk till höger om värdet är satt.

Resultatet sparas via samma `update.mutate({ start_at })` (ISO-sträng) — tid + datum kombineras lokalt och konverteras till ISO. Tom = `null`.

## i18n

Lägg till nycklar i `sv.json` och `en.json` under `sequence.schedule`:
- `pickDate` ("Välj datum" / "Pick a date")
- `time` ("Tid" / "Time")
- `today`, `tomorrow`, `nextMonday`, `clear`

## Tekniskt

- Använd befintliga `@/components/ui/calendar`, `@/components/ui/popover`, `date-fns` (redan i projektet) och `date-fns/locale` för sv/enUS-formatering.
- Locale väljs via `i18n.language.startsWith("sv")`.
- Inga nya beroenden, inga schema-/DB-ändringar.

## Filer som ändras
- `src/pages/sequence/StepSchedule.tsx`
- `src/i18n/locales/sv.json`
- `src/i18n/locales/en.json`
