import SeoArticleLayout from "@/components/SeoArticleLayout";

const MailleadVsApollo = () => (
  <SeoArticleLayout
    title="MailLead.ai vs Apollo — vilket är bäst för svenska B2B-team?"
    description="Detaljerad jämförelse av MailLead.ai och Apollo.io: pris i SEK, GDPR, svenskspråkig AI, leveransbarhet och vilket verktyg som passar för outbound på den svenska marknaden."
    path="/jamfor/maillead-vs-apollo"
    heading={<>MailLead.ai vs Apollo: vilket passar dig?</>}
    intro={
      <p>
        Apollo.io är en av världens största outbound-plattformar — kraftfull,
        men byggd för den amerikanska marknaden. MailLead.ai är ett
        svenskbyggt alternativ med svenskspråkig AI, GDPR-anpassade
        leadkällor och fakturering i SEK. Här är en ärlig jämförelse så du
        kan välja rätt verktyg för ditt team.
      </p>
    }
    sections={[
      {
        h2: "Snabb översikt",
        body: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold">Funktion</th>
                  <th className="text-left py-2 px-3 font-semibold">MailLead.ai</th>
                  <th className="text-left py-2 pl-3 font-semibold">Apollo.io</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:align-top">
                <tr className="border-b border-border/50"><td className="pr-3">Språk i UI & AI</td><td className="px-3">Svenska + engelska</td><td className="pl-3">Endast engelska</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Valuta</td><td className="px-3">SEK (svensk faktura)</td><td className="pl-3">USD</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">GDPR-första leadkällor</td><td className="px-3">Ja, svenska företagsdata</td><td className="pl-3">Global databas — kräver egen filtrering</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">AI skriver hela sekvensen</td><td className="px-3">Ja</td><td className="pl-3">Ja (engelska)</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Inbyggt CRM / dialer</td><td className="px-3">Nej — fokus på e-post</td><td className="pl-3">Ja</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Lägsta plan</td><td className="px-3">Gratis · betald från 290 kr/mån</td><td className="pl-3">Gratis · betald från ca $49/mån</td></tr>
                <tr><td className="pr-3">Support</td><td className="px-3">Svensk support</td><td className="pl-3">Engelsk chat</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        h2: "När Apollo är rätt val",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Du säljer internationellt och behöver en global leaddatabas.</li>
            <li>Du vill ha allt-i-ett: e-post, samtal, CRM och dataanrikning.</li>
            <li>Ditt team är komfortabelt med engelska gränssnitt och USD-fakturor.</li>
            <li>Du har en SDR-organisation med 10+ personer som motiverar tyngre setup.</li>
          </ul>
        ),
      },
      {
        h2: "När MailLead.ai är rätt val",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Du säljer främst i Sverige och Norden och vill ha relevanta lokala leads.</li>
            <li>Du vill att AI:n skriver naturlig svenska — inte översatt engelska.</li>
            <li>Du värdesätter enkelhet: bara outbound-flödet, inget CRM att lära sig.</li>
            <li>Du vill ha svensk fakturering, svensk support och GDPR-anpassning från grunden.</li>
          </ul>
        ),
      },
      {
        h2: "Pris i praktiken",
        body: (
          <p>
            Apollos lägsta betalplan är ca $49/mån (~520 kr) men inkluderar bara
            grundfunktionerna; för riktig kapacitet hamnar de flesta team på
            $79–149 per användare. MailLead.ai:s Growth-plan på 990 kr/mån
            täcker det de flesta svenska säljteam behöver — inklusive AI, leads
            och utskick — utan att betala per användare.
          </p>
        ),
      },
    ]}
    faqs={[
      {
        q: "Kan jag importera mina Apollo-leads till MailLead.ai?",
        a: "Ja. Du kan exportera till CSV från Apollo och importera direkt i MailLead.ai. Vi de-duplicerar mot dina pågående kampanjer automatiskt.",
      },
      {
        q: "Har Apollo svensk leaddata?",
        a: "Apollo har global täckning men företagsdata för Sverige är ofta tunnare och mindre uppdaterad än lokala källor. MailLead.ai använder svenska företagsregister direkt.",
      },
      {
        q: "Vad händer med leveransbarheten?",
        a: "Båda verktygen skickar via dina egna inkorgar (Gmail/Outlook/SMTP), så leveransbarheten beror på din domän. MailLead.ai pausar automatiskt vid höga bounce-rater.",
      },
    ]}
    related={[
      { to: "/jamfor/maillead-vs-lemlist", label: "MailLead.ai vs Lemlist" },
      { to: "/kalla-mejl", label: "Kalla mejl — komplett guide" },
      { to: "/b2b-leads-sverige", label: "Köp B2B-leads i Sverige" },
    ]}
  />
);

export default MailleadVsApollo;
