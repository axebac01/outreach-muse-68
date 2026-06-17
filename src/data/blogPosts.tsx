import { ReactNode } from "react";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  heading: ReactNode;
  intro: ReactNode;
  sections: { h2: string; body: ReactNode }[];
  faqs: { q: string; a: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "outbound-trender-2026",
    title: "Outbound 2026: 7 trender som förändrar B2B-säljet i Sverige",
    description:
      "Från AI-skrivna sekvenser till GDPR-pressade leadkällor — så här ser outbound-landskapet ut för svenska B2B-team 2026 och vad du bör göra åt det.",
    excerpt:
      "Volym fungerar inte längre. Här är sju trender som omformar svensk B2B-outbound 2026 — och hur du anpassar dig.",
    publishedAt: "2026-06-10",
    readingMinutes: 7,
    heading: <>Outbound 2026: 7 trender som förändrar B2B-säljet i Sverige</>,
    intro: (
      <p>
        De senaste två åren har outbound-spelplanen ändrats fundamentalt.
        AI gör personalisering trivial, mottagarnas inkorgar är fullare än
        någonsin, och GDPR-tolkningen har skärpts. Här är sju trender vi
        ser på den svenska marknaden 2026 — och vad de betyder för ditt
        säljteam.
      </p>
    ),
    sections: [
      {
        h2: "1. AI skriver hela sekvensen — inte bara öppningsraden",
        body: (
          <p>
            Lemlist gjorde "Liquid Tags" populärt, men 2026 är ribban högre:
            AI:n läser leadens roll, företagsdata och triggers och skriver
            hela 4–5 mejls sekvensen. Mänskliga säljare granskar och
            justerar, men skriver inte från grunden.
          </p>
        ),
      },
      {
        h2: "2. Volym är död — relevans är allt",
        body: (
          <p>
            Att skicka 5 000 generiska mejl per vecka straffas både av
            spamfilter och mottagare. Team som lyckas skickar 200–500 djupt
            personliga mejl per inkorg och vecka — och får högre absoluta
            siffror.
          </p>
        ),
      },
      {
        h2: "3. Svenska företagsregister vinner mot globala databaser",
        body: (
          <p>
            Apollo och ZoomInfo har global skala men tunnare data i Sverige.
            Lokala källor med direktanslutning till Bolagsverket och
            yrkesnätverk ger högre träffsäkerhet och färre bounces.
          </p>
        ),
      },
      {
        h2: "4. Domän- och inkorgshygien blir säljets ansvar",
        body: (
          <p>
            Google och Microsoft skärpte sin avsändarpolicy 2024. SPF, DKIM
            och DMARC är inte längre IT-ansvar — säljchefer som inte koll på
            sin domänhälsa ser kampanjer landa i skräppost.
          </p>
        ),
      },
      {
        h2: "5. Outbound + LinkedIn i samma sekvens",
        body: (
          <p>
            Multikanal-sekvenser (mejl 1 → LinkedIn-touch → mejl 2) får
            2–3x högre svarsfrekvens än rent mejl. Verktygen blir bättre på
            att synka aktiviteter över kanaler utan att stalka mottagaren.
          </p>
        ),
      },
      {
        h2: "6. GDPR-pressen på leadkällor ökar",
        body: (
          <p>
            Integritetsmyndigheten (IMY) har gjort flera nedslag mot
            leadleverantörer som säljer privatpersondata förklädd som B2B.
            Säljteam vill se transparens i datakällor — inte bara en CSV.
          </p>
        ),
      },
      {
        h2: "7. Färre verktyg, mer integration",
        body: (
          <p>
            Tidigare stackar med 6–8 verktyg (leads + sekvenser + warming +
            tracking + CRM) ersätts av plattformar som täcker 80% i ett
            gränssnitt. Det sänker både kostnad och inlärningstid.
          </p>
        ),
      },
      {
        h2: "Vad du bör göra nu",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Granska din domänhälsa (mxtoolbox.com) innan nästa kampanj.</li>
            <li>Byt från generiska mallar till AI-genererade sekvenser per lead.</li>
            <li>Verifiera att din leadleverantör är öppen med datakällor.</li>
            <li>Mät svarsfrekvens, inte bara öppningsfrekvens — iOS Mail Privacy förvränger det senare.</li>
          </ul>
        ),
      },
    ],
    faqs: [
      {
        q: "Är cold email på väg ut?",
        a: "Tvärtom — men spelet har ändrats. Generiska massutskick straffas hårt; personliga relevanta mejl presterar lika bra som någonsin.",
      },
      {
        q: "Kan AI ersätta mina SDRs?",
        a: "Nej, men en SDR med AI kan göra jobbet av tre utan. AI tar pre-research och drafting; människan tar samtal och kvalificering.",
      },
    ],
  },
  {
    slug: "bygga-outbound-fran-noll",
    title: "Så bygger du en outbound-funktion från noll — svensk B2B-guide",
    description:
      "Komplett guide för att starta en outbound-funktion i ett svenskt B2B-bolag: ICP, datakällor, verktygsstack, processer och mätetal under första 90 dagarna.",
    excerpt:
      "ICP, leadkällor, verktygsstack och de mätetal som faktiskt betyder något — så bygger du outbound från noll på 90 dagar.",
    publishedAt: "2026-06-05",
    readingMinutes: 10,
    heading: <>Så bygger du en outbound-funktion från noll på 90 dagar</>,
    intro: (
      <p>
        Att gå från "vi borde göra outbound" till en fungerande pipeline
        tar typiskt tre månader om du gör rätt — och tolv om du börjar i
        fel ände. Den här guiden är ramverket vi sett fungera för svenska
        SaaS-, konsult- och byråbolag.
      </p>
    ),
    sections: [
      {
        h2: "Vecka 1–2: definiera ICP brutalt smalt",
        body: (
          <>
            <p>
              Ideal Customer Profile (ICP) är inte "B2B-bolag i Sverige". Den
              är "SaaS-bolag med 20–80 anställda, säte i Sverige, har anställt
              minst en SDR senaste 12 månaderna, omsättning 10–80 MSEK".
            </p>
            <p>
              Smal ICP gör allt nedströms enklare: leadlistorna blir kortare
              men varmare, AI:n kan skriva mer specifikt, och svarsfrekvensen
              skjuter i höjden.
            </p>
          </>
        ),
      },
      {
        h2: "Vecka 2–3: hitta din datakälla",
        body: (
          <p>
            För svenska B2B fungerar Bolagsverkets data + ett professionellt
            nätverk (LinkedIn) bäst. Verktyg som MailLead.ai bygger
            kvalificerade listor på minuter; manuell prospektering är OK för
            de första 50 leadsen men inte skalbart.
          </p>
        ),
      },
      {
        h2: "Vecka 3–4: domän- och inkorgssetup",
        body: (
          <>
            <p>
              Köp en separat avsändardomän (t.ex. <code>{`get-`}</code>ditt-bolag.se) så du
              inte riskerar din huvuddomäns reputation. Skapa 2–3 inkorgar
              per säljare. Konfigurera SPF, DKIM, DMARC. Värm upp i 2–4
              veckor med 10–30 mejl per dag innan riktig volym.
            </p>
          </>
        ),
      },
      {
        h2: "Vecka 5–8: första kampanjerna",
        body: (
          <p>
            Börja med 3 testkampanjer à 100 leads. Olika ICP-segment, samma
            sekvens-ramverk. Mät svarsfrekvens, inte öppningsfrekvens. Skalar
            den som presterar bäst, döda de andra.
          </p>
        ),
      },
      {
        h2: "Vecka 9–12: process & rapportering",
        body: (
          <>
            <p>Etablera ritualerna:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Veckomöte: svarsfrekvens per kampanj, bokade möten, pipeline-värde.</li>
              <li>Månadsanalys: vinnande ICP-segment, sekvensvarianter, ämnesrader.</li>
              <li>Kvartalsrevision: domänhälsa, leverantörsval, ICP-justering.</li>
            </ul>
          </>
        ),
      },
      {
        h2: "Mätetal som faktiskt betyder något",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Positive reply rate</strong> — det enda KPIet ovanför funneln som korrelerar med pipeline.</li>
            <li><strong>Möten bokade per 100 leads</strong> — säger mer än "möten per vecka".</li>
            <li><strong>Pipeline / outreach-kostnad</strong> — sätter ROI svart på vitt.</li>
          </ul>
        ),
      },
    ],
    faqs: [
      {
        q: "Hur många leads behöver jag per månad?",
        a: "Tumregel för svenska B2B: ~500 leads per dedikerad SDR per månad. Mindre om ICP är smal och ASP hög; mer om volym-spel.",
      },
      {
        q: "Ska jag bygga in-house eller anlita en byrå?",
        a: "Anlita en byrå för månad 1–3 om du saknar erfarenhet — men ta tillbaka in-house när du förstår spelet. Byråer skalar inte med ditt bolag.",
      },
      {
        q: "Hur lång tid tills första bokade mötet?",
        a: "Med smal ICP och bra sekvens: 2–3 veckor från första utskicket. Allt under 6 veckor är inom normalspannet.",
      },
    ],
  },
  {
    slug: "gdpr-cold-email-sverige-2026",
    title: "GDPR och cold email: vad svenska säljteam måste veta 2026",
    description:
      "Klargörande av vad som faktiskt är tillåtet enligt GDPR för B2B-utskick i Sverige 2026 — berättigat intresse, avregistrering, datakällor och IMY:s senaste beslut.",
    excerpt:
      "Berättigat intresse, opt-out, datakällor och IMY:s senaste praxis — så håller du dig på rätt sida av GDPR utan att stoppa outbound.",
    publishedAt: "2026-05-28",
    readingMinutes: 8,
    heading: <>GDPR och cold email i Sverige: så håller du dig laglig 2026</>,
    intro: (
      <p>
        Cold email är fortfarande lagligt i Sverige — men 2026 är ramarna
        tydligare än någonsin. Här går vi igenom vad Integritetsmyndigheten
        (IMY) faktiskt säger, vilka praxisbeslut som påverkar säljteam, och
        hur du säkrar dina utskick utan att tappa volym.
      </p>
    ),
    sections: [
      {
        h2: "Den rättsliga grunden: berättigat intresse",
        body: (
          <p>
            B2B-utskick till en arbetsadress för en yrkesroll är tillåtna
            under <strong>berättigat intresse</strong> (Artikel 6.1.f GDPR).
            Det kräver tre saker: ditt intresse av kontakten, att kontakten
            är rimlig att förvänta sig, och en balansering mot mottagarens
            integritet.
          </p>
        ),
      },
      {
        h2: 'Vad är "rimligt att förvänta sig"?',
        body: (
          <p>
            En VD eller försäljningschef kan rimligen förvänta sig att bli
            kontaktad i sin yrkesroll. En löneassistent på samma bolag kan
            inte rimligen förvänta sig att bli kontaktad om
            säljverktyg. Riktning per roll, inte per bolag.
          </p>
        ),
      },
      {
        h2: "Krav i varje utskick",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Tydlig avsändare (namn + företag + kontaktuppgifter)</li>
            <li>Fungerande avregistreringslänk i varje mejl</li>
            <li>Information om varifrån du fick deras uppgifter (länk räcker)</li>
            <li>Respektera opt-out direkt — samma dag, alla framtida sekvenser</li>
            <li>Inga svepande "samtycke genom att inte avregistrera"-formuleringar</li>
          </ul>
        ),
      },
      {
        h2: "Datakällor: var IMY tittar hårdare",
        body: (
          <p>
            IMY har 2024–2025 gjort flera nedslag mot leverantörer som säljer
            data skrapad från LinkedIn utan rättslig grund eller som blandar
            in privatpersondata förklädd som "B2B". Du som köpare har ansvar
            att kontrollera källan — okunskap är ingen försvar.
          </p>
        ),
      },
      {
        h2: "Praktisk checklista innan du skickar",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Leverantören kan redovisa rättslig grund för insamlingen.</li>
            <li>Endast arbetsrelaterade roller och e-postadresser används.</li>
            <li>DPA (Data Processing Agreement) finns på plats med leverantören.</li>
            <li>Avregistreringar synkas över alla kampanjer, inte bara en.</li>
            <li>Du loggar utskicken (för att kunna svara på registerutdrag).</li>
          </ul>
        ),
      },
      {
        h2: "Vad händer om någon klagar?",
        body: (
          <p>
            De flesta klagomål löses genom att du tar bort personen och
            bekräftar inom 30 dagar (artikel 12 GDPR). Eskalering till IMY är
            sällsynt vid B2B-utskick om du följt grunderna ovan. Sanktioner
            träffar typiskt företag som inte svarar eller fortsätter mejla
            efter opt-out.
          </p>
        ),
      },
    ],
    faqs: [
      {
        q: "Får jag mejla info@-adresser?",
        a: "Ja — info@ är en arbetsadress till bolaget och inte en personuppgift. Men svarsfrekvensen är mycket lägre än personliga adresser, så det är sällan värt det.",
      },
      {
        q: "Måste jag ha samtycke först?",
        a: "Nej, inte för B2B-utskick till yrkesroller. Samtycke krävs för B2C eller för rena marknadsföringsutskick utan affärsrelevans.",
      },
      {
        q: "Hur länge får jag spara leaddata?",
        a: "Så länge syftet är aktuellt — typiskt 12–24 månader för outbound-listor. Etablera en rutin för rensning så du inte sitter med åldrad data.",
      },
    ],
  },
];

export const getPostBySlug = (slug: string) =>
  BLOG_POSTS.find((p) => p.slug === slug);
