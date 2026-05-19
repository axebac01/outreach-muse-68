## Mål

Eftersom CASA-verifiering inte är ett alternativ just nu, ställer vi om anslutningsflödet så att **SMTP + App Password** blir det rekommenderade sättet att koppla på inkorgar. Microsoft OAuth fungerar utan CASA och behålls. Google OAuth flyttas bakom en "avancerat"-länk och varnas tydligt som "Testing mode" (max 100 användare, åter-auth ~7 dagar) tills CASA är råd.

## Vad ändras (UI/UX)

**1. `ConnectEmailDialog` byggs om till tre tydliga steg:**

```text
┌─────────────────────────────────────────┐
│  Anslut inkorg                          │
│                                         │
│  [📧 Gmail (App Password)] ← REKOMMENDERAT
│      Säkert, ingen reauth, 3 min setup  │
│                                         │
│  [📨 Outlook / Microsoft 365]           │
│      Logga in med Microsoft (OAuth)     │
│                                         │
│  [⚙️  Annat (IMAP/SMTP)]                 │
│      Zoho, Fastmail, custom domäner     │
│                                         │
│  Visa avancerade alternativ ▾           │
│   └─ Google OAuth (Testing mode)        │
└─────────────────────────────────────────┘
```

- "Gmail (App Password)" öppnar en ny guidevy med direktlänk till `myaccount.google.com/apppasswords`, steg-för-steg-instruktioner och förifyllda SMTP/IMAP-fält (smtp.gmail.com:465 / imap.gmail.com:993). Användaren klistrar in mejl + app password och klickar "Testa & spara".
- "Outlook / Microsoft 365" → triggar befintlig Microsoft OAuth (oförändrat flöde).
- "Annat (IMAP/SMTP)" → dagens generiska SMTP-vy med Zoho-preset.
- "Avancerat" → expanderar Google OAuth-knappen med en varningsbanner: "Detta använder Google OAuth i Testing-läge. Endast lämpligt för testanvändare; du måste återansluta var 7:e dag."

**2. Ny komponent `GmailAppPasswordGuide.tsx`** som visar:
- Krav: 2FA måste vara aktiverat
- Steg 1: Aktivera 2FA om det inte finns (länk)
- Steg 2: Skapa app password (direktlänk, "MailLead" som namn)
- Steg 3: Klistra in nedan
- Förifyllda dolda SMTP/IMAP-värden — bara `email` + `app_password` syns för användaren

**3. Liknande `OutlookAppPasswordGuide.tsx`** för Outlook.com / personliga konton som inte vill köra OAuth (workspace-konton kan ändå behöva admin-godkännande för app passwords — varnas).

**4. `EmailAccounts.tsx` info-rutan längst ner** (`oauthSoon` / `oauthSoonDesc`) skrivs om:
> "Vi rekommenderar App Password-anslutning för bästa leverans och ingen återkommande inloggning. Google OAuth finns i Testing-läge för avancerade användare."

## Vad ändras (kod)

- `src/components/ConnectEmailDialog.tsx` — byggs om till provider-val → guide eller SMTP-form. Google OAuth flyttas till "advanced"-sektion med varning.
- `src/components/email/GmailAppPasswordGuide.tsx` — ny, wrap runt `connect-smtp-account` med Gmail-presets hårdkodade.
- `src/components/email/OutlookAppPasswordGuide.tsx` — ny, samma men för Outlook.
- `src/i18n/locales/sv.json` + `en.json` — nya strängar för guider, varningar, knappar.
- `src/pages/EmailAccounts.tsx` — uppdatera infotext längst ner.

Inga backend-ändringar behövs — `connect-smtp-account` och `test-smtp` edge functions fungerar redan, och Microsoft/Google OAuth-flödena lämnas orörda.

## Inte med i denna iteration

- Ingen ändring av `oauth-start` / `oauth-callback` edge functions.
- Inget borttag av Google OAuth — bara nedprioriterat i UI.
- Ingen transactional relay (Resend etc.) — kan göras separat senare.
- Ingen ändring av sändlogik (`send-email`, `process-scheduled-sends`).
