
## Mål

1. Lägga till **roll-** och **bransch-filter** i Lead Marketplace-sökningen.
2. Hantera Apollo 403 (free plan) snyggt så användaren förstår vad som hänt istället för en cryptisk 500.

---

## 1. Roll-filter (förvalda titlar)

Idag finns ett fritextfält "Titlar" + "Senioritet". Lägger till en **rollkategori-dropdown** med vanliga svenska B2B-roller som expanderar till en lista av Apollo `person_titles`:

- VD / CEO → `["CEO", "VD", "Managing Director", "Chief Executive Officer"]`
- Säljchef → `["Head of Sales", "Sales Director", "VP Sales", "Säljchef", "CRO"]`
- Marknadschef → `["CMO", "Marketing Director", "Head of Marketing", "Marknadschef"]`
- Grundare → `["Founder", "Co-Founder", "Grundare"]`
- HR-chef → `["HR Director", "Head of People", "CHRO", "HR-chef"]`
- IT-chef / CTO → `["CTO", "Head of IT", "IT Director", "IT-chef"]`
- Ekonomichef / CFO → `["CFO", "Finance Director", "Ekonomichef"]`
- Operations → `["COO", "Head of Operations", "Operations Director"]`
- Produktchef → `["CPO", "Head of Product", "Product Director", "Produktchef"]`

Fritextfältet "Titlar" finns kvar för avancerade användare. Rollen och titlarna slås ihop när de skickas till Apollo.

## 2. Bransch-filter

Apollo använder `organization_industry_tag_ids` (deras interna IDs, inte fritext). Vi lägger till en dropdown med de vanligaste branscherna och deras Apollo tag-IDs hårdkodade:

- SaaS / Software → `5567cd4773696439b10b0000`
- IT-tjänster → `5567cd4e7369644d39040000`
- Marknadsföring / Reklam → `5567cdda7369644d250c0000`
- E-handel → `5567cdf27369643dbf260000`
- Konsult → `5567cd49736964397e020000`
- Finans → `5567cdd87369644d391c0000`
- Bygg / Construction → `5567cdbc7369644eed130000`
- Tillverkning → `5567cdda7369643b80510000`
- Hälso- & sjukvård → `5567cdde73696439dd350000`
- Utbildning → `5567cd4d7369644d2d010000`
- Fastigheter → `5567cdf27369643b791f0000`
- Restaurang / Hospitality → `5567cdd47369644cf94c0000`

(IDs hämtas från Apollos publika industri-lista. Vi börjar med dessa och kan utöka senare.)

Sänds som `organization_industry_tag_ids: [id]` — fältet stöds redan i `apolloSearch`-typen, behöver bara wiras genom edge-funktionen + UI.

## 3. Bättre felhantering för 403 / free plan

`leads-search/index.ts` fångar Apollo-fel och returnerar:
- `403` med `API_INACCESSIBLE` → HTTP 402 + meddelande "Apollo-nyckeln är på gratisplan. Sökning kräver minst Basic-plan ($49/mån). Uppgradera på apollo.io eller byt API-nyckel."
- Andra Apollo-fel → behåller statuskod + parsead `error` string

Frontend (`Leads.tsx`) visar meddelandet i ett tydligt varningskort med länk till apollo.io upgrade-sida istället för dagens cryptiska text. Knappen "Sök" stoppas inte — felet är informativt.

---

## Filer som ändras

- `supabase/functions/leads-search/index.ts` — pass through `organization_industry_tag_ids`, parsea Apollo-felkroppen och returnera 402 + tydligt meddelande vid `API_INACCESSIBLE`.
- `src/pages/Leads.tsx` — två nya `<Select>`-fält (Roll, Bransch), konstanter `ROLES` och `INDUSTRIES`, merge av roll-titlar med fritext-titlar innan sökanrop, snyggare felkort.

Ingen DB-ändring, inga nya secrets, inga ändringar i `apollo.ts` (fältet finns redan i typen).

---

## Notering om Apollo free plan

Apollos free plan blockerar `mixed_people/search`. För att MVP:n ska fungera behöver du antingen:
- Uppgradera nyckeln till minst Apollo Basic ($49/mån), eller
- Byta till en annan provider (kan göras senare — `apollo.ts` är redan isolerad).

Detta löser inte vi i koden — bara visar felet snyggt.
