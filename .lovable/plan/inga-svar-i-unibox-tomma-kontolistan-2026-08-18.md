# Inga svar i Unibox + tomma kontolistan

## Vad jag har verifierat

1. **Kontolistan är tom överallt** (dropdownen i Unibox, och även e-postkontosidan). Orsak: säkerhetsfixen i går tog bort läsrättigheten på tabellen `email_accounts`. Vyn som appen läser (`email_accounts_safe`) kör med användarens egna rättigheter — utan läspolicy returnerar den noll rader trots att dina tre konton (`kevin@`, `oskar@`, `hampus@bisdata-kampanj.se`) finns och är aktiva i databasen. Detta är en ren regression och är bekräftad.

2. **Inga inkommande mejl finns sparade.** Ditt konto har 8 trådar, alla utgående, och **noll** inkommande meddelanden totalt. Synken kör dock utan fel: alla tre konton har `last_synced_at` 06:30 idag och en sparad UID-position. Så synken går igenom men hittar/sparar inget. Exakt varför är **inte bekräftat** ännu — det avgörs i steg 2 nedan.

## Plan

### Steg 1 – Återställ läsrättigheten (bekräftad fix)
Lägg tillbaka en SELECT-policy på `email_accounts` som bara släpper igenom raderna för inloggad användare. Krypterade lösenord/tokens ligger kvar oåtkomliga bakom vyn `email_accounts_safe`, som inte exponerar de kolumnerna — så säkerheten från i går behålls. Efter det fylls dropdownen och kontosidan igen.

### Steg 2 – Ta reda på varför svaren inte hämtas
Kör en manuell synk mot ett av bisdata-kontona med detaljerad loggning och läs av:
- hur många UID:n IMAP-sökningen returnerar,
- om något meddelande filtreras bort (t.ex. som "från mig själv"),
- om MIME-tolkningen eller sparandet fallerar tyst.

De troliga kandidaterna, som loggen ska avgöra mellan:
- **UID-positionen står för högt** — sparad `imap_last_uid` (3812/3928/4065) kan ha satts från en tidigare postlåda eller ett bredare fönster, så nya svar hamnar under gränsen och sökningen ger noll träffar.
- **Svaren hamnar i en annan mapp** än INBOX hos Websupport (t.ex. skräppost), och synken läser bara INBOX.
- **Tyst fel i tolkning/sparande** per meddelande (loggas som `warn` idag och räknas inte som fel utåt).

### Steg 3 – Fixa enligt fyndet och verifiera
Åtgärda det loggen pekar ut (t.ex. rimlighetskontroll av UID-positionen med automatisk återgång till ett 14-dagarsfönster, eller att även läsa skräppostmappen). Verifiera sedan att dina faktiska svar från i morse dyker upp i Unibox, både under "Endast leads" och "Visa alla", och att leadstatus sätts till "svarat" så att uppföljningarna stoppas.

## Teknisk detalj

- Steg 1: migration som skapar `CREATE POLICY ... FOR SELECT TO authenticated USING (auth.uid() = user_id)` på `public.email_accounts` samt säkerställer `GRANT SELECT` till `authenticated`.
- Steg 2: manuellt anrop av `sync-inbox` med regionheadern `x-region: eu-central-1` samt tillfällig loggning i `syncImap` (antal UID, filterorsak per meddelande) och avläsning i funktionsloggarna.
- Steg 3: sannolika ändringar i `supabase/functions/sync-inbox/index.ts` och `supabase/functions/_shared/imapClient.ts`.
