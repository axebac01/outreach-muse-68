import SeoArticleLayout from "@/components/SeoArticleLayout";

const MailleadVsLemlist = () => (
  <SeoArticleLayout
    title="MailLead.ai vs Lemlist — bästa cold email-verktyget i Sverige?"
    description="Jämför MailLead.ai och Lemlist: AI-personalisering, pris, GDPR, svenskspråkigt gränssnitt och leadkällor. Se vilket cold email-verktyg som passar svenska B2B-säljare bäst."
    path="/jamfor/maillead-vs-lemlist"
    heading={<>MailLead.ai vs Lemlist: vilket vinner i Sverige?</>}
    intro={
      <p>
        Lemlist är en av Europas mest kända plattformar för cold email och
        var tidiga med personalisering. MailLead.ai är ett nyare,
        svenskbyggt alternativ med AI på svenska, integrerade leadkällor
        och fakturering i SEK. Så här skiljer de sig.
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
                  <th className="text-left py-2 pl-3 font-semibold">Lemlist</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:align-top">
                <tr className="border-b border-border/50"><td className="pr-3">Språk i UI & AI</td><td className="px-3">Svenska + engelska</td><td className="pl-3">Endast engelska/franska</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Inbyggda leadkällor</td><td className="px-3">Ja — svenska företagsdata</td><td className="pl-3">Ja (global) — separat tillägg</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">AI skriver hela sekvensen</td><td className="px-3">Ja</td><td className="pl-3">Delvis — främst öppningsrad</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Bilder/video-personalisering</td><td className="px-3">Nej — fokus på text</td><td className="pl-3">Ja (Lemlists signum)</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Valuta</td><td className="px-3">SEK</td><td className="pl-3">EUR / USD</td></tr>
                <tr className="border-b border-border/50"><td className="pr-3">Lägsta plan</td><td className="px-3">Gratis · betald från 290 kr/mån</td><td className="pl-3">Från €39/mån per användare</td></tr>
                <tr><td className="pr-3">Per användare?</td><td className="px-3">Nej — fast pris</td><td className="pl-3">Ja</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        h2: "När Lemlist är rätt val",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Du säljer internationellt och vill experimentera med bild- och video-personalisering.</li>
            <li>Ditt team är vana vid engelska SaaS-verktyg.</li>
            <li>Du har en etablerad outbound-process med dedikerade SDRs per inkorg.</li>
          </ul>
        ),
      },
      {
        h2: "När MailLead.ai är rätt val",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Du säljer i Sverige och vill ha AI som skriver naturlig svenska — inte översatt.</li>
            <li>Du vill ha leads och utskick i samma verktyg, inte två separata.</li>
            <li>Du föredrar fast pris istället för att betala per användare.</li>
            <li>GDPR och svensk fakturering måste fungera utan workarounds.</li>
          </ul>
        ),
      },
      {
        h2: "AI-skillnaden",
        body: (
          <p>
            Lemlist var först ute med "Liquid Tags" som låter dig fylla i
            personlig data manuellt. MailLead.ai går steget längre: AI:n läser
            mottagarens roll, företag och eventuella triggers (nyrekrytering,
            tillväxt) och skriver hela sekvensen på svenska — inte bara
            öppningsraden. För svenska säljare som inte vill korrekturläsa
            engelska översättningar är det en stor skillnad.
          </p>
        ),
      },
    ]}
    faqs={[
      {
        q: "Kan jag flytta över mina Lemlist-kampanjer?",
        a: "Ja — exportera kontakter till CSV i Lemlist, importera i MailLead.ai. Sekvenstexter behöver skrivas om eftersom AI:n bygger nya på svenska.",
      },
      {
        q: "Stödjer MailLead.ai bild- och video-personalisering?",
        a: "Inte i nuläget. Vi fokuserar på textbaserad personalisering eftersom det fungerar bäst för svenska B2B-mottagare som ofta är skeptiska till spelifierade utskick.",
      },
      {
        q: "Är Lemlist GDPR-godkänt?",
        a: "Lemlist är GDPR-compliant som plattform, men leadkällor och deras egen filtrering är inte alltid optimerade för svenska B2B-regler. MailLead.ai är byggt med GDPR-först.",
      },
    ]}
    related={[
      { to: "/jamfor/maillead-vs-apollo", label: "MailLead.ai vs Apollo" },
      { to: "/kalla-mejl", label: "Kalla mejl — komplett guide" },
      { to: "/e-postutskick-foretag", label: "E-postutskick till företag" },
    ]}
  />
);

export default MailleadVsLemlist;
