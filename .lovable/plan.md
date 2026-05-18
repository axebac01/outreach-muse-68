# Go-to-market plan: vad krävs för att sälja MailLead på riktigt

Jag tar rollen som konsult och är rak. Produkten är funktionellt på god väg, men ni säljer **cold outreach** — det är en av de mest reglerade och granskade SaaS-kategorierna som finns (GDPR, ePrivacy, CAN-SPAM, Google/Microsoft OAuth-policy, anti-spam-lagar). Att gå live utan att ha följande på plats är en faktisk juridisk och affärsmässig risk, inte en formalitet.

Listan nedan är prioriterad. **P0 = blocker, kan inte sälja utan. P1 = måste finnas inom 30 dagar efter launch. P2 = bör finnas inom 90 dagar.**

---

## P0 — Blockers (måste vara klart innan första betalande kund)

### 1. Google & Microsoft OAuth-verifiering
Detta är det enskilt största hindret. Idag använder ni egna `GOOGLE_CLIENT_ID`/`MICROSOFT_CLIENT_ID` med scopes som `gmail.send` och `gmail.readonly` (eller `Mail.Send`/`Mail.Read`). Innan verifiering:
- Google visar en stor varningsskärm ("Google har inte verifierat denna app") → 99% av användarna dropper.
- Hård gräns: **100 unika användare** innan appen blockeras helt.
- Gmail-scopes är "restricted scopes" → kräver **CASA-säkerhetsbedömning** (Tier 2, ca $1 500–$4 500/år via tredjepart).

Att göra:
- Publicera privacy policy + terms (se punkt 2) på en publik domän.
- Demo-video på YouTube som visar hela OAuth-flödet och hur datan används.
- Skicka in OAuth-verifieringsansökan till Google (ledtid: **4–8 veckor**, ofta iterativt).
- CASA-assessment via Leviathan/Bishop Fox/NCC Group.
- Microsoft Publisher Verification (MPN-konto + domänverifiering, ca 1 vecka).

### 2. Juridiska sidor (publicerade, inte i en låda)
- **Privacy Policy** — måste täcka: vilka data ni läser från Gmail/Outlook, hur länge ni lagrar mejl-innehåll, AI-bearbetning (ni skickar mejlinnehåll till Google/OpenAI via Lovable AI Gateway → måste deklareras), tracking-pixlar, IP-loggning från `track-visit`.
- **Terms of Service** — särskilt klausuler om acceptable use (förbjud spam, kräv att kunden har laglig grund), uppsägning, ansvarsbegränsning, SLA.
- **DPA (Data Processing Agreement)** — obligatoriskt för B2B i EU. Mall från Iubenda/Termly eller anlita jurist (~10–25k SEK engångskostnad).
- **Cookie-policy + consent-banner** på landningssidan (ePrivacy).
- **Subprocessor-lista** — publicera Supabase, Lovable, Google AI, OpenAI, IPinfo som underbiträden.
- **Impressum** (om ni säljer i DE) och företagsuppgifter i footern.

### 3. GDPR-compliance i själva produkten
Cold outreach + EU = ni måste kunna försvara er rättsliga grund. Tekniska krav:
- **DSR-flöde (Data Subject Requests)**: en mottagare av cold mail kan begära radering. Ni har `forget-visitor` för tracking men **inte** för leads/mejl-innehåll. Bygg en publik endpoint (`/dsr` eller mejladress) + admin-UI för kunden att radera en lead + all historik.
- **Retention policy**: idag lagras `email_messages.body_html` evigt. Sätt automatisk purge efter X månader (konfigurerbart per kund, default 12 mån).
- **Audit-logg**: vem skickade vad till vem och när (delvis finns i `email_messages`, men ingen export).
- **Data residency-fråga**: Supabase-projektet ligger förmodligen i EU-region — verifiera och dokumentera. Lovable AI Gateway routar till US-modeller → måste stå i privacy policy.
- **Lawful basis-hjälp i UI**: tvinga kunden att kryssa "jag har laglig grund (berättigat intresse / samtycke) för dessa leads" vid import.
- **Suppression list per workspace**: finns delvis (`unsubscribes`) men suppression bör även gälla över alla kampanjer i workspacet (verifiera).

### 4. Betalning & prissättning
Idag finns `Pricing.tsx` men ingen faktisk billing-integration. Utan detta kan ni inte ta betalt.
- Aktivera Lovable Payments (Stripe rekommenderas för B2B SaaS med moms).
- Definiera planer konkret: idag säger `useUsage.ts` Starter (1 kampanj, 10 leads, 10 outreach/mån) vs Growth (∞). Detta är inte säljbart — Growth ∞ är ekonomisk självmord när varje mejl kostar er i AI-tokens och infra. Inför:
  - Hård takgräns för aktiva leads/månad per plan.
  - AI-credits separat mätare (sequence-generering, improve-step, analyze-company kostar pengar varje gång).
  - Antal connected inboxes per plan.
- Trial-strategi: 7- eller 14-dagars trial med kreditkort, eller freemium med 1 inbox + 50 leads.
- Moms-hantering: Stripe Tax (managed payments) — viktigt eftersom ni säljer B2B inom EU och har reverse-charge på VAT.
- Faktura-PDF + kvitto via mejl.

### 5. Deliverability & sändar-reputation (annars är produkten värdelös)
Vi har redan diskuterat att "warmup" bara är en ramp-up. För att kunden ska få genomslag krävs:
- **SPF/DKIM/DMARC-checker i onboarding**: ni måste verifiera kundens egen domän innan första utskick. Lägg till en check (DNS-lookup i edge function) som visar grönt/rött i `EmailAccounts.tsx`.
- **Bounce-handling**: idag finns ingen logik för hard/soft bounces → automatisk avskild lead efter bounce. Måste byggas (parse bounce-mejl i `sync-inbox` eller webhook).
- **Spam-complaint hantering**: List-Unsubscribe finns ✓, men inget på komplikt rapportering (FBL).
- **Sändningsgränser per provider**: Gmail = 500/dag (gratis) eller 2000/dag (Workspace), Outlook = 300/dag. Ni har en generisk cap men respekterar inte provider-specifika gränser. Lägg in i `process-scheduled-sends`.
- **Tredjepartsintegration för riktig warmup** (Mailreach/Warmup Inbox) — annonsera tidigt eller bygg.

### 6. Säkerhet
- Kör `security--run_security_scan` och åtgärda allt P0/P1.
- Aktivera **HIBP leaked password check** (en parameter i `configure_auth`).
- Verifiera att `EMAIL_TOKEN_ENCRYPTION_KEY` är roterbar och att SMTP-lösenord faktiskt är krypterade (inte fallback-plaintext).
- Rate limiting på edge functions (särskilt `send-email`, `generate-sequence`, `track-visit`).
- Penetrationstest light (ZAP/Burp gratis-scan) innan launch.
- 2FA för användarkonton (TOTP).

---

## P1 — Inom 30 dagar efter launch

### 7. Onboarding & aktivering
- Stega användaren genom: connect inbox → verify DNS → import leads → write sequence → launch. Idag finns `OnboardingGate` men flödet är inte tvingande.
- Tom-state varianter på alla sidor (Inbox, Analytics, Campaigns).
- Sample-data / "demo campaign" så användaren ser värdet inom 60 sekunder.

### 8. Support-infrastruktur
- Helpdesk-mejl (`support@`) + ärendesystem (Crisp/Plain/Intercom gratis-tier).
- Statussida (status.maillead.io) — krävs ofta i B2B-upphandling.
- Kunskapsbas med minst 10 artiklar (SPF/DKIM setup, hur skriva bra sequence, etc.).
- In-app chat eller åtminstone "Contact support" knapp.

### 9. Observability
- Sentry för frontend errors.
- Edge function-loggar samlas idag bara i Supabase — sätt larm på `process-scheduled-sends` failures och `sync-inbox-cron` misslyckanden.
- Daglig hälsorapport (mejl till er): hur många utskick, hur många bounces, hur många nya konton.

### 10. Mätbarhet & analytics för er själva
- Posthog/Mixpanel för product analytics (aktivering, retention, churn).
- Stripe-data → MRR/ARR dashboard.

### 11. Marknadsföringssida
- Landing redan finns men ofta tunn. Behövs: case studies, jämförelse vs Lemlist/Instantly/Smartlead, FAQ om GDPR (säljpunkt i EU!), changelog.
- SEO: title/meta/JSON-LD per sida.

### 12. Brand & policy
- Acceptable Use Policy publicerad och **håndhävd** — automatisk avstängning vid spam-rapport-tröskel. Annars riskerar ni att hela `@maillead.local` Message-ID-domänen blacklistas.
- Sätt riktig domän på `localMessageId` (idag `@maillead.local` — det är trasig deliverability).

---

## P2 — Inom 90 dagar

- SOC 2 Type I-förberedelse (Vanta/Drata) — många mellanstora B2B-kunder kräver det.
- Migrera till "äkta" Sending domain warmup (Mailreach-integration).
- Team-funktion (flera användare per workspace, roller).
- Webhook-API för kunder.
- Affiliate/referral-program.
- Lokalisering av billing (separata priser SEK/EUR/USD).

---

## Kritiska saker som inte fungerar idag (behöver fix oavsett)

Från snabb genomgång av koden:

1. **`@maillead.local` i Message-ID-headern** i `send-email/index.ts` — ska vara er riktiga domän, annars dålig deliverability.
2. **Ingen bounce-loop-protection** — om en lead bouncar i steg 1 fortsätter sequencen ändå.
3. **`useUsage.ts` Growth = Infinity** — ingen kontroll alls, missbruksrisk.
4. **`encrypt_secret` har fallback till plaintext** om `EMAIL_TOKEN_ENCRYPTION_KEY` saknas — verifiera att nyckeln är satt i prod.
5. **Inga RLS-tester** — kör `supabase--linter` och säkerhetsscan innan release.
6. **Email-validering vid lead-import** — duplicates, syntax, role-based addresses (info@, support@) bör flaggas/blockeras.

---

## Hård rekommendation

Skeppa **inte** publikt förrän minst följande är klart: **(1) OAuth-verifiering inlämnad** (ni får sälja under tiden den behandlas), **(2) Privacy/ToS/DPA publicerat**, **(3) Stripe live + minst en betald plan**, **(4) DNS-check i onboarding**, **(5) säkerhetsscan grön**, **(6) `@maillead.local` borttaget**.

Allt annat kan iterera in efter första 10 betalande kunderna. Men listan ovan är vad seriösa B2B-köpare kommer ifrågasätta i ett upphandlingsmöte.

---

## Vad vill du att jag tar tag i härnäst?

Förslag på första konkreta paket att implementera (en i taget):
- **A. Juridik-infrastruktur**: Privacy/ToS/Cookie-sidor + consent + DSR-flöde i UI.
- **B. Billing**: Aktivera Stripe + bygg om planer + paywall i UI.
- **C. Deliverability-paket**: DNS-checker i onboarding + fix `@maillead.local` + bounce-handling.
- **D. Säkerhet**: Säkerhetsscan + HIBP + rate limiting + RLS-audit.
- **E. OAuth-verifieringsförberedelse**: privacy policy + demo-video-spec + scopes-justification-dokument.

Vilket vill du börja med?