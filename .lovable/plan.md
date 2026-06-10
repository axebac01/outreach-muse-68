## Mål
Återanvänd den befintliga orange gradient-effekten (`.em`-klassen med `--em-g` gradient) på en lämplig del av den nya hero-rubriken.

## Ändring
I `src/components/AuroraLanding.tsx`, rad 166:

Från:
```tsx
<h1 className="hh">Hitta nya B2B-kunder med AI-drivna utskick</h1>
```

Till:
```tsx
<h1 className="hh">Hitta nya B2B-kunder med <em className="em">AI-drivna utskick</em></h1>
```

## Varför "AI-drivna utskick"
Det är produktens kärnvärde och den mest distinkta delen av rubriken — naturligt fokus för accenten. Alternativ vore "B2B-kunder", men det är mer generiskt.

## Tekniskt
- `.em`-klassen finns redan (rad 387) och använder `--em-g` som är definierad både i ljust (rad 317: `#E0512B → #D9920F`) och mörkt tema (rad 338: `#F47C54 → #E0A019`).
- Inga CSS-ändringar behövs.
- `<em>` får ärva font-style från befintlig styling; om det blir kursivt och inte önskat lägger vi till `font-style:inherit` på `.hh .em` (en rads tillägg).

## Filer
- `src/components/AuroraLanding.tsx` (1 rad)
