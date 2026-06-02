
## Mål

Stänga gapen i Lead Marketplace-flödet före launch så att hela kedjan **sök → avslöja → kampanj** funkar utan att lämna `/leads`-sidan, och så att köpta leads aldrig "försvinner".

---

## A. Skapa ny kampanj inline från Leads

I sticky-footern vid `Select`-dropdownen "Importera till sekvens" läggs ett alternativ längst upp:

> **+ Skapa ny kampanj…**

Klick öppnar en `<Dialog>` med fälten: **Namn**, **Målgrupp**, **Produkt**, **Erbjudande**, **Ton** (samma som `/campaigns/new` kräver, men i en kompakt vy).

Vid submit:
- Anropar `useCreateCampaign().mutateAsync(form)` (befintlig hook).
- DB-triggern `create_sequence_for_campaign` skapar automatiskt en matchande sekvens.
- Frontenden hämtar sekvensens id (`sequences.campaign_id = campaign.id`) och sätter `sequenceId` så att nästa "Avslöja"-klick importerar direkt till den.
- Toast: "Kampanj skapad — leads importeras dit".

Ingen DB-ändring krävs.

## B. Tab "Mina köpta leads" på /leads

Sidan får två tabs överst (shadcn `<Tabs>`):

1. **Sök** (befintlig vy)
2. **Mina leads** (ny vy)

### "Mina leads"-vyn

Listar `marketplace_leads` för användaren (RLS finns redan) med:
- Tabell-rader: namn, titel, företag, email, datum avslöjad, kostnad (credits).
- Sökfält (filtrera på namn/företag/email, klient-sida räcker för MVP).
- Checkbox per rad + "Markera alla".
- Sticky footer (samma mönster som söktabben): dropdown för sekvens + "+ Skapa ny kampanj…" + knapp **Importera valda**.
- Tom-state: "Inga köpta leads än. Gå till Sök för att börja."

Återanvänder `leads-import` edge-funktionen (tar redan `marketplace_lead_ids` + `sequence_id`).

Ingen ny edge-funktion, inga nya tabeller, ingen ny migration.

## C. Förbättrad feedback efter import

Efter lyckad import via `leads-import` (gäller både Sök-tabben och Mina leads):

- Toast får en **Action-knapp** "Visa i sekvens" som navigerar till `/campaign/:campaignId` (vi slår upp campaign_id via sequence_id).
- Om 0 importerade (alla dubbletter) → varningstoast: "Alla {n} leads fanns redan i sekvensen".
- Om partiell: "X importerade · Y fanns redan".

---

## Filer som ändras / skapas

- **src/pages/Leads.tsx** — wrappa innehållet i `<Tabs>`, lägg in nya tab-vyn, lägg till "+ Skapa ny kampanj" i båda sekvens-dropdowns, förbättrad toast.
- **src/components/leads/CreateCampaignInlineDialog.tsx** (ny) — kompakt kampanj-skapande-dialog som returnerar `{ campaignId, sequenceId }`.
- **src/components/leads/MyLeadsTab.tsx** (ny) — vyn för köpta leads med tabell, filter, sticky import-footer.
- **src/components/leads/ImportToSequencePicker.tsx** (ny, valfritt refactor) — delad komponent för dropdown + "+ Skapa ny kampanj" så A används på båda tabs utan duplicering.

Inga ändringar i edge-funktioner, DB-schema eller secrets.

---

## Out of scope (medvetet)

- Re-reveal av samma lead (Apollo kostar igen — vi visar bara att den finns).
- Export till CSV från Mina leads (kan läggas till efter launch).
- Bulk-radera köpta leads (RLS tillåter inte DELETE idag, kräver migration — väntar).
