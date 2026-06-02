import AuroraLanding from "@/components/AuroraLanding";
import SeoHead from "@/components/SeoHead";

const FAQS: [string, string][] = [
  ["Kan jag avsluta när som helst?", "Ja – avsluta när som helst från inställningarna. Inga frågor. Är du på Growth har du tillgång till slutet av faktureringsperioden."],
  ["Vad händer när jag når gratisgränsen?", "Du kan fortfarande se dina befintliga kampanjer och mejl. För att skapa fler utskick eller nya kampanjer uppgraderar du till Growth."],
  ["Sparar ni mina leaddata?", "Ja, dina leads sparas säkert så att du kommer åt dina kampanjer när som helst. Vi delar eller säljer aldrig dina data."],
  ["Kan jag testa Growth innan jag betalar?", "Starter-planen ger dig full tillgång till AI-motorn. Growth tar bara bort gränserna så att du kan skala."],
];

const Landing = () => (
  <>
    <SeoHead
      title="MailLead.ai — Personliga utskick som faktiskt får svar"
      description="MailLead.ai hjälper svenska B2B-team skriva personliga kalla mejl i stor skala — utan timmar av research och manuell skrivning."
      path="/"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "MailLead.ai",
          url: "https://maillead.ai/",
          inLanguage: "sv-SE",
          publisher: { "@type": "Organization", name: "MailLead" },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map(([q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        },
      ]}
    />
    <AuroraLanding />
  </>
);

export default Landing;
