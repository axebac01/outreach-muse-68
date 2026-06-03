import AuroraLanding from "@/components/AuroraLanding";
import SeoHead from "@/components/SeoHead";
import { LANDING_FAQS } from "@/data/landingFaqs";

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
          mainEntity: LANDING_FAQS.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "MailLead",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: "https://maillead.ai/",
          description:
            "AI-driven cold outreach för svenska B2B-team — personliga kalla mejl och uppföljningar för varje lead.",
          offers: [
            {
              "@type": "Offer",
              name: "Starter",
              price: "0",
              priceCurrency: "SEK",
              url: "https://maillead.ai/pricing",
            },
            {
              "@type": "Offer",
              name: "Growth",
              price: "990",
              priceCurrency: "SEK",
              url: "https://maillead.ai/pricing",
            },
          ],
        },
      ]}
    />
    <AuroraLanding />
  </>
);

export default Landing;
