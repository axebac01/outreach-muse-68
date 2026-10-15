# Fix: "Fixa →" i återanslutningsbannern gör ingenting

## Orsak

Bannern länkar till `/email-accounts` — men användaren står redan där, så klicket ser ut att inte göra något. Värre: på sidan finns ingen återanslut-knapp för hampus@bisdata-kampanj.se, eftersom knappen bara visas för Google/Microsoft-konton. hampus@ är ett SMTP-konto med utgånget lösenord (auth_failed), och för SMTP-konton saknas helt en väg att återansluta.

## Åtgärd

1. **Bannern leder till rätt ställe:** `ReconnectBanner` länkar till `/email-accounts?reconnect=<kontots id>`.
2. **Sidan reagerar på parametern:** `EmailAccounts.tsx` läser `reconnect`-parametern, scrollar till och markerar det trasiga kontot (tydlig ram), och öppnar automatiskt återanslutningsdialogen för det kontot.
3. **Återanslutning för SMTP-konton:** `ConnectEmailDialog` får stöd för ett valfritt befintligt konto — den öppnas då direkt i SMTP/IMAP-vyn med e-post, värd, port och användarnamn ifyllda. Användaren behöver bara fylla i nytt lösenord och spara.
4. **Spara uppdaterar befintligt konto:** `connect-smtp-account` tar emot ett valfritt `account_id`; då uppdateras befintligt konto (nya krypterade lösenord, status tillbaka till active, paused_reason nollställs) i stället för att skapa en dubblett. Ägarskap kontrolleras (kontot måste tillhöra inloggad användare).
5. **Knapp på kontokortet:** SMTP-konton med status error/needs_reconnect får samma "Återanslut"-knapp som OAuth-konton, som öppnar dialogen i återanslutningsläge.
6. Distribuera om `connect-smtp-account` och verifiera: klicka "Fixa →" i bannern → dialogen öppnas med hampus@ ifyllt → nytt lösenord → testa & spara → kontot blir aktivt igen.

## Teknisk detalj

- `ReconnectBanner.tsx`: länk till `/email-accounts?reconnect=${first.id}`.
- `EmailAccounts.tsx`: `useSearchParams`, ref + `scrollIntoView` på matchande konto, ring-markering, auto-öppna dialog.
- `ConnectEmailDialog.tsx`: ny prop `reconnectAccount?: EmailAccount | null`; prefill av `form` från kontot, hoppa över provider-valet, skicka `account_id` vid sparande.
- `connect-smtp-account/index.ts`: om `account_id` finns → `update` på befintlig rad (med `eq("user_id", userId)`), annars `insert` som idag.
