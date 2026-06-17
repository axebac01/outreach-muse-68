import SeoArticleLayout from "@/components/SeoArticleLayout";

const B2bLeadsSverige = () => (
  <SeoArticleLayout
    title="Köp B2B-leads i Sverige — så funkar det 2026"
    description="Vad kostar B2B-leads i Sverige? Hur hittar du beslutsfattare med rätt jobbmejl? Guide till lead-marknader, datakvalitet och GDPR."
    path="/b2b-leads-sverige"
    heading={<>Köp B2B-leads i Sverige: så väljer du rätt källa</>}
    intro={
      <p>
        Att köpa B2B-leads låter enkelt — men kvaliteten skiljer sig dramatiskt
        mellan källor. Här går vi igenom vad du faktiskt får, vad ett bra lead
        ska innehålla, vad det kostar och vad GDPR säger om köpta listor i
        Sverige.
      </p>
    }
    sections={[
      {
        h2: "Vad är ett B2B-lead?",
        body: (
          <p>
            Ett lead är en kontakt på ett företag som matchar din målgrupp:
            beslutsfattare i rätt roll, på företag i rätt storlek, bransch eller
            geografi. Ett komplett lead innehåller minst: jobbtitel, jobbmejl,
            företagsnamn, organisationsnummer och bransch.
          </p>
        ),
      },
      {
        h2: "Vad kostar B2B-leads i Sverige?",
        body: (
          <>
            <p>
              Marknadspriserna 2026 ligger ungefär så här (per kontakt med
              verifierad jobbmejl):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Rådata utan mejl: 1–3 kr</li>
              <li>Verifierad jobbmejl: 4–10 kr</li>
              <li>Mejl + direktnummer + företagsdata: 10–25 kr</li>
            </ul>
            <p>
              MailLead.ai prissätter per credit — 1 credit per lead du faktiskt
              avslöjar — och refunderar automatiskt om mejlet bouncer.
            </p>
          </>
        ),
      },
      {
        h2: "Köpta listor & GDPR",
        body: (
          <p>
            B2B-data är tillåten under GDPR så länge du har laglig grund
            (berättigat intresse), är transparent med varifrån du fått datan,
            och respekterar opt-out. Köp aldrig listor med privata Gmail- eller
            Hotmail-adresser — det är där juridiken blir verkligt grumlig.
          </p>
        ),
      },
      {
        h2: "Så här fungerar leadköp i MailLead.ai",
        body: (
          <>
            <p>
              Du filtrerar på roll, bransch, företagsstorlek och region. Du ser
              först en preview (företag + titel, ingen mejl). När du klickar
              "Avslöja" debiteras 1 credit och du får hela kontakten — direkt
              importerbar till en kampanj.
            </p>
            <p>
              Hård bounce inom 7 dagar → automatisk refund. Inga prenumerationer
              för bara leadköp; betala när du faktiskt vill ha kontakter.
            </p>
          </>
        ),
      },
    ]}
    faqs={[
      {
        q: "Hur fräscha är leadsen?",
        a: "Vi uppdaterar datan kontinuerligt. Mejlverifiering körs vid avslöjande, och hård bounce inom 7 dagar refunderas automatiskt.",
      },
      {
        q: "Kan jag exportera leadsen till mitt CRM?",
        a: "Ja — alla avslöjade leads kan exporteras till CSV och importeras direkt i Hubspot, Pipedrive eller Lime.",
      },
      {
        q: "Får jag använda leadsen för kalla mejl?",
        a: "Ja, det är hela poängen. Datan är insamlad för B2B-prospektering och uppfyller GDPR-kraven för berättigat intresse.",
      },
    ]}
    related={[
      { to: "/kalla-mejl", label: "Kalla mejl — guide & mallar" },
      { to: "/e-postutskick-foretag", label: "E-postutskick till företag" },
    ]}
  />
);

export default B2bLeadsSverige;
