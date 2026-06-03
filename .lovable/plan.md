
# SEO-lyft på landningssidan

Tre frontend-only ändringar för att stärka `/` inför launch. Inga nya routes, ingen backend, inget innehåll som behöver vara "Kommer snart".

## 1. Semantisk rubrikstruktur i `AuroraLanding.tsx`

Idag är hero-rubriken en stylad `<div>`/`<p>` — Google ser ingen riktig `<h1>` på sidan, och sektionsrubriker är inte konsekventa `<h2>`.

- Konvertera hero-rubriken ("Personliga utskick som faktiskt får svar" eller motsvarande) till en riktig `<h1>` med behållna Tailwind-klasser
- Säkra att varje sektion (Steg, Features, Priser, FAQ) har en `<h2>` som visuellt redan finns — bara byt taggen
- Ingen visuell förändring, endast semantik

## 2. Synlig FAQ-sektion på `/`

`Landing.tsx` har redan 4 frågor i `FAQPage` JSON-LD, men de renderas aldrig synligt. Google vill se båda; användare gillar det också.

- Lägg en ny `<section id="faq">` i `AuroraLanding.tsx` ovanför footer/CTA med en `<h2>"Vanliga frågor"</h2>` och en accordion (kan återanvända samma stil som FAQ-sektionen i `Pricing.tsx`)
- Utöka från 4 → 7 frågor. Två listor (en i `Landing.tsx` JSON-LD, en i `AuroraLanding.tsx` UI) hålls i synk via en delad konstant i `src/data/landingFaqs.ts`
- Nya frågor täcker söktermer som dyker upp i Semrush long-tail:
  - "Funkar MailLead med Gmail och Outlook?"
  - "Är kalla mejl tillåtet enligt GDPR i Sverige?"
  - "Hur skiljer sig MailLead från Lemlist och Instantly?"
- Importera den delade listan både i `Landing.tsx` (för JSON-LD) och i den nya FAQ-sektionen

## 3. `SoftwareApplication`-schema i `Landing.tsx`

Lägga till ett tredje JSON-LD-objekt vid sidan av `WebSite` och `FAQPage`. Ger Google strukturerad info om pris och produktkategori — kan visa pris/recensioner direkt i sökresultatet senare.

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "MailLead",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "SEK" },
    { "@type": "Offer", "name": "Growth", "price": "990", "priceCurrency": "SEK" }
  ]
}
```

## Filer som ändras

- `src/components/AuroraLanding.tsx` — hero blir `<h1>`, sektionsrubriker blir `<h2>`, ny `<section id="faq">` med accordion
- `src/data/landingFaqs.ts` — ny fil, delad FAQ-lista (7 frågor)
- `src/pages/Landing.tsx` — importera FAQ-listan, lägg till `SoftwareApplication` i `jsonLd`-arrayen

## Utanför scope

- og:image-fil (separat fråga — `index.html` refererar till `/og-image.jpg` som inte finns, men du valde att hoppa över det här)
- Blogg / artikelkluster (post-launch)
- Tekniska SEO-ändringar i `sitemap.xml` / `robots.txt` (inga nya routes)
