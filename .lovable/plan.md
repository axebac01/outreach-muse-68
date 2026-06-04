## Mål

Ersätt den tomma "Börja söka bland leads"-rutan med en mer lockande preview som visar 4–5 fejkade exempel-leads, så att användaren förstår exakt vad de får ut av en sökning — utan att tro att det är riktiga leads.

## Vad som byggs

I `src/pages/Leads.tsx`, i blocket `{!searchTriggered && (...)}` (rad 823–834), byt ut den befintliga `Card` med Sparkles-ikon mot en ny komponent `SampleLeadsPreview`.

### Layout

```text
┌───────────────────────────────────────────────────────┐
│  ✨ Börja söka bland leads                            │
│  Sätt dina filter till vänster — sökning är gratis,  │
│  du betalar bara 2 credits per lead du avslöjar.     │
│                                                       │
│  ┌─ Så här ser resultaten ut ──────── Exempel ──┐    │
│  │ ☐  An**a S******m   🔒 Lås upp                │    │
│  │    VP of Sales · TechFlow                     │    │
│  │    [Email] [Direktnr] [Plats] [Bransch]       │    │
│  ├───────────────────────────────────────────────┤    │
│  │ ☐  Ma***s J*****n   🔒 Lås upp                │    │
│  │    Head of Growth · DataPulse                 │    │
│  │    [Email] [Plats] [Bransch]                  │    │
│  ├───────────────────────────────────────────────┤    │
│  │ ... 3 till                                    │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│           👉 Fyll i filter och klicka Sök             │
└───────────────────────────────────────────────────────┘
```

### Detaljer

- Yttre `Card` med `border-dashed` behålls (matchar dagens stil).
- Rubrik + förklarande text överst, centrerad, ungefär som idag men något tightare.
- Under texten: en sektion med liten label `Exempel — så här ser resultaten ut` (badge i hörnet) som tydligt markerar att raderna är preview.
- 4–5 sample-rader som visuellt matchar `visiblePeople.map`-kortet (rad 1024–1156): obfuskerat namn, titel · företag, signal-badges (Email/Direktnr/Plats/Bransch). Använd inte riktig `Card` per rad — använd lättare `div` med `border-b` så det känns som en preview, inte riktiga resultat.
- Hela preview-blocket får `opacity-70` + `pointer-events-none` så det signalerar "inte interaktivt".
- En diagonal "watermark"-känsla via subtil bakgrund (`bg-muted/30`) eller en liten `Badge variant="secondary"` med texten `Exempel` uppe till höger på varje rad — räcker för tydlighet.
- Sample-data hårdkodas i komponenten (svenska namn/företag som passar målgruppen): t.ex. Anna Söderström (VP of Sales, Klarna), Marcus Johansson (Head of Growth, Spotify), Emily Lindqvist (CMO, Tink), Johan Bergman (Founder, Kry), Sofia Eklund (Sales Director, Voi).
- Avslutas med en mjuk CTA-text: `Fyll i filter till vänster och klicka Sök leads för att se riktiga resultat.`

## Filer

- `src/pages/Leads.tsx` — byt ut `{!searchTriggered && (...)}` blocket. Sample-data + markup inline (liten komponent högst upp i filen eller bara JSX direkt, ~60 rader).

Inga ändringar i data, hooks eller backend.
