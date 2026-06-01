
# Pre-launch checklista för MailLead.ai

Produkt = **MailLead / MailLead.ai** (oförändrat). Juridisk leverantör = **CRMdata i Sverige AB**, orgnr **559255-7929**, Hagaesplanaden 86, 113 67 Stockholm. Dom: **maillead.ai**.

Nedan är allt jag hittat som måste hanteras innan publicering, grupperat i 6 spår. Varje punkt har status: **[FIX]** (jag kan göra det automatiskt), **[DU]** (kräver att du gör något externt), eller **[FRÅGA]** (jag behöver svar innan jag rör det).

---

## Spår 1 — Bolag, juridik & footer

1. **[FIX]** Uppdatera `src/config/legal.ts`:
   - `companyName: "CRMdata i Sverige AB"`
   - `orgNumber: "559255-7929"`
   - `address: "Hagaesplanaden 86, 113 67 Stockholm"`
   - `productName: "MailLead"` (oförändrat)
   - `website: "https://maillead.ai"`
   - `lastUpdated: "2026-06-01"`
2. **[FRÅGA]** Kontaktadresser. Vad ska användas för:
   - `contactEmail` (support, t.ex. `support@maillead.ai`?)
   - `privacyEmail` (`privacy@maillead.ai`?)
   - `dpoEmail` (`dpo@maillead.ai`? — eller hoppa över DPO?)
   Om du vill att en och samma adress används för allt, säg vilken.
3. **[FIX]** Privacy/Terms/Cookies/Subprocessors-sidorna läser allt från `legal.ts` så de uppdateras automatiskt när #1 är klart.
4. **[FRÅGA]** Underbiträdes­listan (`SUBPROCESSORS` i `legal.ts`) innehåller idag: Supabase (Lovable Cloud), Lovable AB, Google (Gmail/Gemini), Microsoft (Graph), OpenAI (via Lovable AI), IPinfo. Vill du ha med ett eget moln-/säkerhets­underbiträde (t.ex. Cloudflare för CDN) eller är listan komplett som den är?

## Spår 2 — Falska marknadssiffror & testimonials (juridisk risk)

Landing-sidan visar idag påhittade siffror och röster som **inte** är riktiga och som kan ses som vilseledande marknadsföring (MFL):
- "**500+** Aktiva team", "**50K+** Mejl skickade", "**3.2x** Snitt-ökning i svar"
- Testimonial "Sarah Chen, Säljchef GrowthStack"
- Testimonial "Marcus R., Grundare SalesSync"

**[FRÅGA]** Vad gör vi?
- **A**) Ta bort hela sektionerna (rekommenderat tills ni har riktiga kunder).
- **B**) Ersätt med ärlig "New — early access"-formulering ("Bygg din första kampanj på under 10 minuter" etc).
- **C**) Du har riktiga citat/siffror — skicka dem så lägger jag in dem.

## Spår 3 — Domän, SEO & metadata

5. **[DU]** Lägg till **maillead.ai** som custom domain i Lovable (Settings → Domains) och peka A/CNAME mot Lovable enligt instruktionerna där.
6. **[FIX]** `index.html`:
   - Sätt `<html lang="sv">` (primärspråk är svenska).
   - Lägg till `<link rel="canonical" href="https://maillead.ai/" />`.
   - `og:url` = `https://maillead.ai/`, `og:image` byts från `lovable.dev/opengraph-image-p98pqg.png` till en egen.
   - Behåll `<title>` och description, men översätt till svenska (eller behåll engelska om landningssidan i första hand är engelsk — säg vilket).
   - Twitter handle `@MailLeadAI` — **[FRÅGA]** finns det kontot? Annars tar jag bort `twitter:site`.
   - Lägg till JSON-LD `Organization` med CRMdata-info.
7. **[FIX]** Skapa `public/sitemap.xml` (Landing + alla `/legal/*` + `/dsr` + `/login` + `/signup`) och referera den i `robots.txt`.
8. **[FRÅGA]** OG-bild: vill du att jag genererar en (1200×630, MailLead-brand)? Annars lämnar jag den utan (det är bättre än Lovable-default).

## Spår 4 — OAuth & e-postsändning i produktion

9. **[DU]** **Microsoft Entra-app** (befintlig client_id): under *Authentication → Redirect URIs* lägg till:
   - `https://maillead.ai/oauth/callback`
   (Behåll preview-URL:en tills vidare för test.) Publisher Verification väntar vi med som vi enats om.
10. **[DU]** **Google Cloud OAuth-klient** (`GOOGLE_CLIENT_ID`): samma sak — lägg till `https://maillead.ai/oauth/callback` som *Authorized redirect URI* och `https://maillead.ai` som *Authorized JavaScript origin*. (Google-knappen är "Under utveckling" i UI så detta är förberedelse.)
11. **[FIX]** Verifiera att `oauth-start`/`oauth-callback` läser `redirect_uri` från frontend (de gör det) — inget kodbyte behövs men jag bekräftar.
12. **[DU + FIX]** **Transaktionella e-postmeddelanden** (lösenords­återställning, inbjudningar): just nu skickar Lovable Cloud auth-mejl från Lovables default-domän. För att skicka från `notify@maillead.ai` måste vi sätta upp en e-postdomän — det kräver att du lägger NS-records på `notify.maillead.ai` hos er DNS-leverantör. Jag kan dra igång setupen via en knapp i nästa runda; säg bara till.

## Spår 5 — Säkerhet & drift

13. **[FIX]** Köra säkerhetsscan på databasen (RLS-policies, exponerade tabeller, leaked-password-skydd) och åtgärda eventuella fynd.
14. **[FIX]** Aktivera **HIBP leaked-password check** i auth.
15. **[FIX]** Bekräfta att alla edge functions har CORS + JWT-validering där det krävs (jag scannar).
16. **[FRÅGA]** **Kostnadstak / rate limits**: vill du ha någon hård gräns per användare för (a) AI-anrop (Gemini/GPT) och (b) e-postsändning per dag? Annars finns risk att en kund kan dra på sig stora AI-kostnader.
17. **[FIX]** Säkra att `EMAIL_TOKEN_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`, `TRACKING_LINK_SECRET` är satta (de är det idag enligt secrets-listan ✓).
18. **[FIX]** Lägg till en `/health` eller statusindikator? **[FRÅGA]** — behövs det för er drift, eller hoppas vi över?

## Spår 6 — Publicering & varumärke

19. **[DU]** Sätt projektets **publish visibility = public** (jag kan göra det åt dig efter godkännande).
20. **[FRÅGA]** **"Edit with Lovable"-badge**: ska den döljas på den publicerade sajten? (Kräver Pro-plan; jag kan toggla det åt dig.)
21. **[FRÅGA]** Cookie-banner: appen har en consent-mekanism för tracker-skriptet, men jag ser ingen synlig cookie-banner på landing. Behövs en banner som blockerar tracking tills besökaren samtycker? (Krävs av ePrivacy i EU om ni sätter analytics-cookies. Just nu tror jag att vår egen tracker är cookie-fri men låt mig verifiera när du ger grönt ljus.)

---

## Vad som INTE ändras

- Produktnamnet "MailLead" / "MailLead.ai" i navbar, logga, copy, i18n, tracker-namespace (`window.MailLead`) — du valde att behålla det.
- Strängarna "Namnge det MailLead" i `emailProviders.ts` (anslutningsguider) — det är instruktion till användaren när de skapar app-lösenord och är fortsatt korrekt.
- Befintliga Microsoft OAuth-flödet, edge functions och databasstruktur.

---

## Föreslagen ordning för att exekvera

1. Du svarar på **[FRÅGA]**-punkterna ovan (mejladresser, marknads­siffror, OG-bild, kostnadstak, badge, twitter, underbiträden, health, cookie-banner). Då kör jag igång **Spår 1, 2, 3, 5, 6** i ett pass.
2. Du gör **[DU]**-stegen i Spår 3.5 (custom domain) och Spår 4.9–10 (OAuth-redirects) parallellt.
3. När `maillead.ai` är aktiv: vi triggar Spår 4.12 (e-postdomän) — tar några dagar för DNS.
4. Slutkörning: jag publicerar, du verifierar end-to-end (signup → connect Outlook → skicka testkampanj).
