# AI-kategorisering & förslag på svar i Unibox

Lägger till automatisk sentiment-analys, kategorisering och AI-genererat svarsförslag för varje inkommande mejl. Allt körs på backend via Lovable AI (gemini-3-flash-preview), cachas i databasen och visas direkt när användaren öppnar tråden.

## Datamodell

Migration på `email_messages` (lägg till nullable kolumner — endast inbound fylls i):
- `sentiment` text — `positive` | `negative` | `neutral` | `auto_reply` | `unsubscribe_request`
- `category` text — t.ex. `interested`, `not_interested`, `question`, `meeting_request`, `objection`, `out_of_office`, `wrong_person`, `other`
- `language` text — ISO-kod (`sv`, `en`, …) detekterad från mejlets text
- `suggested_reply` text — AI-genererat svarsförslag (bara för positiva svar som behöver respons)
- `ai_analyzed_at` timestamptz — när analysen kördes
- `ai_analysis_error` text — fellogg om något brast

Speglas i `email_threads` så listvyn kan visa badge utan extra join:
- `last_sentiment` text
- `last_category` text

## Edge function: `analyze-inbound-email`

Trigger: anropas från `sync-inbox` direkt efter `persistInbound` returnerar id på den nya raden. Körs alltså 1 gång per nytt inkommande mejl. Idempotent — hoppar över om `ai_analyzed_at` redan satt.

Input: `{ message_id: uuid }`. Funktionen:
1. Hämtar mejlet + senaste 5 utgående mejl i samma `thread_key` (för kontext, så svaret matchar tonen i tidigare kommunikation).
2. Hämtar leadens namn + företag samt avsändarens `sender_name`/signatur från `email_accounts`.
3. Hämtar avsändar-företagets info från `profiles` (namn, värdeerbjudande, ton) — så förslaget låter som användaren.
4. Anropar Lovable AI med **tool-calling** för strukturerad output:

```ts
tools: [{
  type: "function",
  function: {
    name: "analyze_email",
    parameters: {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["positive","negative","neutral","auto_reply","unsubscribe_request"] },
        category: { type: "string", enum: ["interested","not_interested","question","meeting_request","objection","out_of_office","wrong_person","other"] },
        language: { type: "string", description: "ISO 639-1 (sv, en, no, da, fi, de, ...)" },
        needs_reply: { type: "boolean" },
        suggested_reply: { type: "string", description: "Only when needs_reply=true. Same language as the email. Match user's tone. No greeting line repetition." }
      },
      required: ["sentiment","category","language","needs_reply"]
    }
  }
}],
tool_choice: { type: "function", function: { name: "analyze_analyze" } }
```

5. Sparar resultatet i `email_messages` + uppdaterar `email_threads.last_sentiment`/`last_category`.
6. Felhantering: 429/402 returneras med tydlig text, sätter `ai_analysis_error`. `sync-inbox` loggar men avbryter inte — kategorisering kan köras i efterhand.

System-prompt fokuserar på cold outreach-svar:
- Avgör sentiment baserat på avsikt (positivt = öppen för dialog/möte, negativt = inte intresserad/avregistrera, neutralt = frågor utan tydlig riktning, auto_reply = OOO/auto-svar).
- Förslag ska vara kort (under 80 ord), vänligt, och svara på en konkret fråga om sådan finns. Skriver alltid på `language`. Avslutar utan signatur (UI lägger till).

## Manuell omkörning

Knapp "Analysera" i konversationsvyn anropar samma function för det aktuella mejlet (för befintliga mejl före den här featuren, eller för att be om nytt förslag).

## UI-ändringar i `Inbox.tsx`

1. **Trådlista (`ThreadRow`)**: liten färgad prick + label baserad på `last_sentiment` (grön/röd/grå) + kategori-text bredvid datumet. Inga ikoner för `auto_reply`.
2. **Konversationshuvud**: badge-rad med sentiment + kategori + språk för senaste inbound-mejlet.
3. **Reply-composer**:
   - När en tråd öppnas och senaste inbound har `suggested_reply` → fyll `reply`-state automatiskt med förslaget (men bara om användaren inte redan börjat skriva).
   - Liten label ovanför textarea: "AI-förslag · klicka för att redigera" + knapp "Rensa" + knapp "Generera nytt".
   - Om sentiment är `negative` eller `unsubscribe_request` → ingen auto-fyllning, istället en varningstext ("Avsändaren verkar inte intresserad" / "Avregistreringsbegäran — lägg till i unsubscribes").
   - För `unsubscribe_request`: extra knapp "Lägg till i Unsubscribes" som skriver till `unsubscribes`-tabellen.

4. **Filter-kolumn**: ny dropdown "Sentiment" (Alla / Positiva / Negativa / Neutrala / Auto-svar) som filtrerar trådlistan via `last_sentiment`.

## Hooks (`useInbox.ts`)

- `useInboxThreads` får ny filterparameter `sentiment`.
- Realtime triggar redan invalidate på messages — när `analyze-inbound-email` skriver tillbaka kommer UI uppdateras automatiskt och förslaget poppar in inom någon sekund efter att mejlet hämtats.

## Tekniska val
- **Modell**: `google/gemini-3-flash-preview` — snabb, billig, klarar svenska/engelska och tool calling utmärkt. Bra för envägsanalys per mejl.
- **Inget extra API-kostnadsskydd**: vi förlitar oss på Lovable AI:s rate limits. Felmeddelande surfas i UI om 402 inträffar.
- **Inget user-toggle för auto-analys** i v1 — alltid på. Kan läggas till i settings senare om ni vill.

## Filer som skapas/ändras
- Migration: lägg till kolumnerna ovan
- `supabase/functions/analyze-inbound-email/index.ts` (ny)
- `supabase/functions/sync-inbox/index.ts` (anropa analyze efter insert)
- `src/hooks/useInbox.ts` (sentiment-filter, fält i interfaces)
- `src/pages/Inbox.tsx` (badges, auto-fyll förslag, sentiment-filter, "Generera nytt"-knapp)
- `src/integrations/supabase/types.ts` regenereras automatiskt