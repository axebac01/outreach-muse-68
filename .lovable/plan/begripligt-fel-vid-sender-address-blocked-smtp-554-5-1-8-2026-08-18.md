# Begripligt fel vid "Sender Address Blocked" (SMTP 554 5.1.8)

## Vad som hände
Vid test av det nya SMTP-kontot svarade mejlservern med `554 5.1.8 Sender Address Blocked`. Vårt SMTP-test känner inte igen den koden, så det klassas som `smtp_generic` och användaren får bara "SMTP test failed" plus en rå engelsk teknisk rad.

Vad felet betyder: servern accepterar inte adressen som avsändare. Vanliga orsaker hos svenska leverantörer (Websupport/Loopia/one.com m.fl.):
- kontot är inte behörigt att skicka som just den adressen (alias istället för riktig brevlåda),
- utgående SMTP är avstängt för kontot eller kräver särskilt "SMTP-lösenord"/app-lösenord,
- avsändardomänen är spärrad för relay från externa IP-adresser.

Notera: testet loggar bara in (EHLO/AUTH), det skickar inget mejl — servern spärrar alltså redan på anslutnings-/inloggningsnivå.

## Vad som ska göras

1. **Klassificera felet** i SMTP-testet: nya koder `smtp_sender_blocked` (554 / 5.1.8 / "sender address blocked" / "relay access denied" / 550 5.7.1) i stället för `smtp_generic`.
2. **Svensk förklaring i UI** med konkreta åtgärder: kontrollera att adressen är en riktig brevlåda (inte alias), att utgående SMTP är påslaget hos leverantören, och att användarnamnet är hela mejladressen. Engelsk motsvarighet läggs till också.
3. **Visa teknisk detalj hoprullad** ("Visa tekniska detaljer") i stället för som huvudmeddelande, så användaren ser något begripligt först.
4. **Ingen blank skärm**: säkerställ att 400-svaret från testfunktionen hanteras som ett normalt formulärfel i dialogen och inte bubblar upp till felöverlägget.

## Teknisk omfattning
- `supabase/functions/test-smtp/index.ts`: utöka `classifySmtpError` med sender-blocked-mönster; deploya funktionen.
- `src/lib/errorMessages.ts`: mappa `smtp_sender_blocked` -> ny i18n-nyckel.
- `src/i18n/locales/sv.json` och `en.json`: nya texter.
- `src/components/ConnectEmailDialog.tsx`: visa detaljraden hoprullad och säkerställ att felet fångas.

Inga databasändringar.
