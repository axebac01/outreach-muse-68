## Mål

Lägg till ett tredje, jämbördigt alternativ "IMAP / SMTP" i `ConnectEmailDialog` — precis som Instantly visar Google, Microsoft och "Any provider (IMAP)" som tre likvärdiga val.

Idag finns SMTP/IMAP-formuläret redan i koden men är gömt under en liten "Advanced"-collapsible längst ner. Det ska lyftas upp till en riktig tredje knapp och öppna ett dedikerat formulär-läge.

## Ändringar

**Endast frontend** — ingen backend, ingen DB, inga edge functions ändras. `connect-smtp-account` och `test-smtp` används redan av det befintliga formuläret.

### `src/components/ConnectEmailDialog.tsx`

1. Lägg till state `view: "providers" | "smtp"` (default `"providers"`).
2. **Vy 1 — providers**: Visa tre knappar i samma stil:
   - Connect with Google (befintlig)
   - Connect with Microsoft (befintlig)
   - **Connect with IMAP / SMTP** (ny) — samma kort-stil, ikon `Mail` från lucide, sätter `view = "smtp"` vid klick
   - Ta bort divider + Collapsible-omslaget
3. **Vy 2 — smtp**: 
   - Visa en "← Back"-knapp överst som återgår till providers
   - Rendera det befintliga SMTP/IMAP-formuläret (presets, email, display_name, SMTP-block, IMAP-block, Test/Save-knappar)
   - Ingen logikändring i `handleTest` / `handleSave`
4. Återställ `view` till `"providers"` när dialogen stängs.

### i18n-strängar (`src/i18n/locales/en.json` och `sv.json`)

Lägg till:
- `emailAccounts.connectImap` — "Connect with IMAP / SMTP" / "Anslut med IMAP / SMTP"
- `emailAccounts.imapDescription` — kort undertext, t.ex. "Use any email provider" / "Använd valfri e-postleverantör"
- `emailAccounts.back` — "Back" / "Tillbaka"

Befintliga `showSmtp` / `hideSmtp` / `orAdvanced` kan tas bort (eller lämnas oanvända).

## Layout

```
┌─────────────────────────────────────┐
│ Connect email account               │
├─────────────────────────────────────┤
│ [G]  Connect with Google         →  │
│ [M]  Connect with Microsoft      →  │
│ [✉]  Connect with IMAP / SMTP    →  │
│       Use any email provider        │
└─────────────────────────────────────┘
```

Efter klick på IMAP/SMTP byts hela innehållet ut mot formuläret med en Back-knapp överst.

## Inte med i denna ändring

- Inga schemaändringar — `email_accounts` har redan alla SMTP/IMAP-kolumner
- Ingen ny edge function — `connect-smtp-account` och `test-smtp` finns
- Ingen ändring i listvy / `useEmailAccounts`
