import SeoArticleLayout from "@/components/SeoArticleLayout";

const EpostutskickForetag = () => (
  <SeoArticleLayout
    title="E-postutskick till företag — regler, mallar & verktyg 2026"
    description="Guide till e-postutskick till företag i Sverige: vad GDPR och marknadsföringslagen tillåter, hur du undviker spam-filter och vilka verktyg som passar bäst."
    path="/e-postutskick-foretag"
    heading={<>E-postutskick till företag: regler, leveransbarhet & verktyg</>}
    intro={
      <p>
        Vill du nå nya företag via mejl utan att hamna i skräpposten? Då måste
        du behärska tre saker: vad lagen tillåter, hur du tekniskt sätter upp
        din inkorg, och vad du faktiskt skriver. Här är hela guiden.
      </p>
    }
    sections={[
      {
        h2: "Vad säger lagen om B2B-utskick?",
        body: (
          <>
            <p>
              Marknadsföringslagen och GDPR tillåter utskick till
              företagsadresser med stöd av berättigat intresse — du behöver
              alltså inte opt-in från företaget på förhand. Däremot måste du:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Skicka till arbetsrelaterade roller, inte privata mejl</li>
              <li>Identifiera avsändare och syfte tydligt</li>
              <li>Ha en avregistreringslänk i varje utskick</li>
              <li>Sluta mejla en mottagare som tackar nej</li>
            </ul>
          </>
        ),
      },
      {
        h2: "Leveransbarhet: SPF, DKIM och DMARC",
        body: (
          <p>
            Innan du börjar skicka i större skala måste din domän ha SPF, DKIM
            och DMARC korrekt uppsatta — annars hamnar dina mejl i skräpposten
            oavsett innehåll. MailLead.ai gör en automatisk deliverability-check
            när du kopplar in en inkorg och guidar dig genom DNS-uppsättningen
            om något saknas.
          </p>
        ),
      },
      {
        h2: "Massutskick vs personliga utskick",
        body: (
          <>
            <p>
              Klassiska nyhetsbrev (Mailchimp-stil) fungerar för befintliga
              kunder. För att vinna nya kunder är personliga utskick — ett
              unikt mejl per mottagare, skickat från en riktig inkorg —
              överlägset:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>3–10× högre svarsfrekvens</li>
              <li>Mindre risk att flaggas som spam</li>
              <li>Bygger relation från första mejlet</li>
            </ul>
          </>
        ),
      },
      {
        h2: "Verktyg för B2B-utskick",
        body: (
          <p>
            MailLead.ai är byggt för svenska B2B-team som vill skicka
            personliga utskick i skala. Du kopplar in dina inkorgar (Gmail,
            Outlook, SMTP), bygger sekvenser, låter AI:n personifiera varje mejl
            och samlar svaren i en gemensam Unibox.
          </p>
        ),
      },
    ]}
    faqs={[
      {
        q: "Hur många mejl per dag är säkert?",
        a: "Nya inkorgar bör börja på max 20–50 mejl per dag och rampa upp över 4–6 veckor. MailLead.ai sköter denna uppvärmning automatiskt.",
      },
      {
        q: "Måste jag ha en cookie-banner för utskick?",
        a: "Nej, cookie-bannern gäller spårning på webbplats. För själva utskicket räcker det med korrekt avsändarinfo och avregistreringslänk.",
      },
      {
        q: "Vad gör jag om någon klagar?",
        a: "Avregistrera dem direkt, bekräfta i ett svarsmejl och rensa från alla framtida kampanjer. MailLead.ai gör detta automatiskt vid opt-out.",
      },
    ]}
    related={[
      { to: "/kalla-mejl", label: "Kalla mejl — guide & mallar" },
      { to: "/b2b-leads-sverige", label: "Köp B2B-leads i Sverige" },
    ]}
  />
);

export default EpostutskickForetag;
