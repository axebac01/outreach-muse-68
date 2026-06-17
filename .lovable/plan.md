# Förbättra SEO ytterligare — plan

Semrush hittade ingen data för maillead.ai ännu (för ny domän). Det betyder att vi måste fokusera på **grundbygget** som hjälper Google upptäcka, förstå och lita på sidan. Här är förbättringar grupperade efter impact. Säg vilka du vill att jag kör — vi kan ta allt eller plocka.

---

## A. Tekniska quick wins (1 implementations-pass, hög impact)

1. **OG-bild** — vi har `og-image.jpg` refererad i `index.html` men jag har inte verifierat att filen finns/ser bra ut. Genererar en ny premium OG-bild (1200×630) med produktnamn + ny hero-rubrik om filen saknas eller är generisk.
2. **`<html lang>` per språk** — sätts korrekt till `sv` redan, bra. Lägger till `hreflang="sv-SE"` på alla SEO-sidor.
3. **Robots.txt + sitemap-direktiv** — lägger till `Sitemap: https://maillead.ai/sitemap.xml` i robots.txt så Google hittar den snabbare.
4. **Sitemap-generator istället för statisk fil** — `scripts/generate-sitemap.ts` som körs via `predev`/`prebuild`. Då blir det omöjligt att glömma uppdatera sitemap när vi lägger till routes.
5. **Lazy-loading & bildoptimering** — inventera alla `<img>` på landing, lägg till `loading="lazy"` + `decoding="async"` på allt under fold. Hero-bild förblir eager.
6. **Preconnect till Supabase/fonts** — `<link rel="preconnect">` i `index.html` för snabbare LCP.

## B. Innehåll & nya SEO-sidor (medel impact, störst långsiktig effekt)

7. **2–3 fler long-tail-sidor** — t.ex.:
   - `/cold-email-mall` (mall + nedladdningsbar variant — bra länkbete)
   - `/leadgenerering-b2b` (bredare term än "b2b-leads")
   - `/jamfor/maillead-vs-apollo` eller `/jamfor/maillead-vs-lemlist` (jämförelser rankar lätt och konverterar)
8. **Pricing-sidans SEO** — `/pricing` har idag bara `<SeoHead>` antagligen tunn. Förstärka med JSON-LD `Product` + `Offer` så Google kan visa rikt resultat.
9. **FAQ-utbyggnad på landing** — fler frågor → mer FAQ-rich snippets i SERP.
10. **Blogg-grund** — `/blogg` med 3 startartiklar. Stor satsning, säg till om du vill det istället för minimalt.

## C. Auktoritet & indexering (en gång, kontinuerlig effekt)

11. **Google Search Console-verifiering** — jag kan verifiera maillead.ai automatiskt via META-taggen (vi har Google-connectorn). Då börjar vi se faktisk söktrafik, klick och rankings direkt.
12. **Skicka in sitemap till GSC** efter verifiering.
13. **Bing Webmaster Tools** — samma men för Bing (de driver också ChatGPT-search).
14. **Strukturerad data utökad** — lägg till `BreadcrumbList` på fler sidor, `Organization.sameAs` med sociala länkar (om vi har), `WebSite` med `SearchAction` för sitelinks searchbox.

## D. UX-signaler som påverkar SEO (medel impact)

15. **Core Web Vitals-pass** — mät LCP/CLS/INP på landing, fixa det som är rött. Sannolikt: hero-bild prio, font-display: swap.
16. **Intern länkstruktur** — säkerställ att varje sida länkar till 2–3 andra relevanta sidor (vi har detta delvis i SEO-sidornas "Läs vidare", men landing skulle vinna på en "Resurser"-sektion).

---

## Rekommendation: kör A + C nu, B i nästa pass

**Pass 1 (A + C — ca 15 min implementation):**
- OG-bild + lang/hreflang + robots-sitemap + sitemap-generator
- Lazy-loading + preconnect
- Verifiera i Google Search Console + skicka in sitemap
- Utöka JSON-LD (BreadcrumbList, WebSite SearchAction)

**Pass 2 (B — när du har tid):**
- 2 fler SEO-sidor (jämförelse + cold-email-mall)
- FAQ-utbyggnad
- Pricing JSON-LD

**Pass 3 (om vi vill gå tungt):**
- Bloggstruktur med 3 startartiklar

---

## Vad behöver jag från dig

- **Vilka pass kör vi?** A+C räcker långt för soft launch. B ger trafik på 2–4 månaders sikt.
- **Konkurrenter att jämföras med?** Säg t.ex. "Apollo, Lemlist, Instantly" så bygger jag rätt jämförelsesidor.
- **OG-bild — generera ny?** Eller har du en designad redan?
