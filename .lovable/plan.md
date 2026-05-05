# Fixar i Unibox-implementationen

Vid genomgång hittades fyra konkreta fel. Inboxen renderar och RLS/realtime är korrekt, men sync och trådlogik fungerar inte i praktiken förrän dessa är åtgärdade.

## Bugg 1 — Sync hoppar över alla konton (KRITISK)
I `supabase/functions/sync-inbox/index.ts` rad 277:
```ts
if (acc.auth_type === "oauth" && acc.provider === "google") { ... }
```
Men i databasen lagras providern som `"gmail"` (verifierat via `select distinct provider from email_accounts`). Resten av kodbasen (`send-email`) använder också `"gmail"`. Resultat: "Hämta nytt" gör en lyckad körning men hämtar 0 mejl eftersom loopen alltid faller in i `else { continue }`.

**Fix:** ändra till `acc.provider === "gmail"`.

## Bugg 2 — Inkommande svar hamnar i fel tråd
- Utgående mejl får `thread_key = "subj:<ämne>:<mottagare>"` (ingen Gmail-thread_id finns vid sändtillfället).
- Inkommande svar i `sync-inbox` sätter `thread_key = msg.threadId` (Gmails trådId).
- Dessa två nycklar matchar aldrig → svaret skapar en **ny** tråd istället för att hamna i samma konversation som det utgående mejlet.

**Fix i `persistInbound`:** när vi hittar `prior` via `In-Reply-To` ska vi återanvända `prior.thread_key` för det inkommande meddelandet och tråduppslaget. Fall tillbaka till nuvarande logik bara om ingen prior hittas.

## Bugg 3 — `pause_on_reply` triggas aldrig korrekt
I `sync-inbox` rad 245–247:
```ts
await admin.from("sequence_leads")
  .update({ status: "replied" })
  .eq("sequence_id", sequenceId).eq("id", leadId);
```
`leadId` här kommer från tabellen `leads`, men filtret matchar mot `sequence_leads.id` (helt annan tabell utan FK). Uppdateringen träffar 0 rader.

**Fix:** matcha på e-postadress istället:
```ts
.eq("sequence_id", sequenceId)
.ilike("email", fromEmail)
```

## Bugg 4 — Konversationsrutan är dold på "lg"-bredd
I `src/pages/Inbox.tsx` rad 215 har konversationskolumnen klasserna `lg:hidden xl:flex`. Mellan 1024 och 1279 px visas alltså trådlistan men inte själva konversationen — man kan välja en tråd men inte läsa eller svara.

**Fix:** ändra till `hidden xl:flex` (mobil/tablet döljer som idag, xl och uppåt visar). På lg-bredd visar vi då bara 2 kolumner (filter + lista). Alternativt göra konversationen synlig även på lg genom att ta bort `lg:hidden`. Jag väljer det sistnämnda så användare på 1024–1279 px får läsa och svara — vi gömmer filterkolumnen istället på lg om utrymmet inte räcker. Slutgiltigt: `grid-cols-1 xl:grid-cols-[280px_360px_1fr] lg:grid-cols-[320px_1fr]` och konversationskolumnen blir `hidden lg:flex`.

## Småsaker som åtgärdas samtidigt
- `Re:`-prefix-koll i Inbox.tsx görs case-insensitive (`/^re:/i`) så vi inte får "Re: Re: ...".
- I `sync-inbox` lägga till `.eq("user_id", account.user_id)` i lead-uppslaget (redan finns) — dubbelkollat OK.

## Filer som ändras
- `supabase/functions/sync-inbox/index.ts` (bugg 1, 2, 3)
- `src/pages/Inbox.tsx` (bugg 4 + Re:-fix)

Inga DB-migreringar behövs. Edge function `sync-inbox` redeployas automatiskt.