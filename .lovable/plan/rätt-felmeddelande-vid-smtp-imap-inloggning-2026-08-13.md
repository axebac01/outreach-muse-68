# Rätt felmeddelande vid SMTP/IMAP-inloggning

## Vad som hände

Servern svarade korrekt den här gången — båda testerna fick ett äkta inloggningsfel från din mejlleverantör:

- SMTP: `535 5.7.8 Error: authentication failed`
- IMAP: `NO [AUTHENTICATIONFAILED] Authentication failed`

Det betyder att servern nåddes (värd, port och TLS är rätt), men att användarnamn/lösenord avvisades av `m101.websupport.se`.

Problemet med texten: felmeddelandet för `smtp_auth_failed` är skrivet för Gmail och nämner "app-lösenord" och "2-stegsverifiering" även när kontot ligger hos en vanlig mejlleverantör där lösenordet är samma som webbmailens. Det gör rådet missvisande.

## Vad som ändras

### 1. Leverantörsanpassat inloggningsfel
Felöversättaren väljer text utifrån värdnamnet:

- Gmail-värdar: nuvarande app-lösenordstext behålls.
- Outlook/Microsoft: befintlig text om att personlig Outlook-SMTP är avstängd behålls.
- Alla andra värdar (egen domän/webbhotell): ny neutral text — "Mejlservern nekade inloggningen. Kontrollera att användarnamnet är hela mejladressen och att lösenordet är samma som du loggar in med i webbmailen. Vissa leverantörer kräver att SMTP/IMAP aktiveras för kontot."

Samma uppdelning för IMAP.

### 2. Checklista direkt i dialogen vid inloggningsfel
När testet ger auth-fel visas en kort punktlista under felet:

- Användarnamn = hela mejladressen (inte bara delen före @)
- Lösenordet är detsamma som i webbmailen — inte kontolösenordet hos webbhotellet
- Kolla att SMTP/IMAP är påslaget för postlådan hos leverantören
- Prova port 587 (STARTTLS) om 465 (SSL) nekas

### 3. Serverns tekniska detalj syns fortfarande
Den råa raden (`535 5.7.8 …`) visas som liten grå text under meddelandet, så det går att skicka vidare till leverantörens support.

## Tekniska detaljer

- `src/lib/errorMessages.ts`: `toUserMessage` får möjlighet att välja i18n-nyckel utifrån kontext (värdnamn) för koderna `smtp_auth_failed` och `imap_auth_failed`.
- `src/components/ConnectEmailDialog.tsx`: skickar med värdnamnet, renderar checklista och teknisk detalj i testresultatraderna.
- Nya nycklar i `sv.json` och `en.json` (`errors.smtp.authFailedGeneric`, `errors.imap.authFailedGeneric`, checklistetexter).
- Inga ändringar i edge functions — de klassificerar redan felet rätt.
