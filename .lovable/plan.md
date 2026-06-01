## Problem

I providerväljaren visas Gmail OAuth som "Kommer senare" (avstängd), men det finns ingen väg in för Gmail via SMTP/IMAP med app-lösenord. Det beror på att `getVisibleProviders()` i `src/lib/emailProviders.ts` filtrerar bort hela Gmail-provider om inte `VITE_ENABLE_GOOGLE_OAUTH=true`. Det är fel — flaggan handlade om OAuth-flödet, inte om app-lösenordsguiden, som inte kräver Googles CASA-granskning.

## Ändring

**`src/lib/emailProviders.ts`**
- Ta bort Gmail-filtret i `getVisibleProviders()`. Returnera hela `EMAIL_PROVIDERS`.
- Rensa kommentaren om `VITE_ENABLE_GOOGLE_OAUTH` (inte längre relevant här).

## Resultat

I dialogen "Anslut e-postkonto":
- Microsoft OAuth — fortfarande första alternativet (one-click)
- Gmail OAuth — fortfarande "Kommer senare" (disabled)
- **Gmail (app-lösenord)** — visas nu som klickbar guide-tile (Gmail-färgad ikon, badge "App-lösenord")
- Outlook/365, Yahoo, iCloud, Fastmail, Zoho — oförändrade
- Anpassad SMTP/IMAP längst ner — oförändrad

Ingen ändring i edge functions, översättningar eller annan logik.
