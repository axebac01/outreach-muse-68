// Shared FAQ list used both for the visible FAQ section on the landing page
// (src/components/AuroraLanding.tsx) and the FAQPage JSON-LD in
// src/pages/Landing.tsx. Keep these in sync via this single source.

export interface LandingFaq {
  q: string;
  a: string;
}

export const LANDING_FAQS: LandingFaq[] = [
  {
    q: "Kan jag avsluta när som helst?",
    a: "Ja – avsluta när som helst från inställningarna. Inga frågor. Är du på Growth har du tillgång till slutet av faktureringsperioden.",
  },
  {
    q: "Vad händer när jag når gratisgränsen?",
    a: "Du kan fortfarande se dina befintliga kampanjer och mejl. För att skapa fler utskick eller nya kampanjer uppgraderar du till Growth.",
  },
  {
    q: "Sparar ni mina leaddata?",
    a: "Ja, dina leads sparas säkert så att du kommer åt dina kampanjer när som helst. Vi delar eller säljer aldrig dina data.",
  },
  {
    q: "Funkar MailLead med Gmail och Outlook?",
    a: "Ja. Du kopplar din Gmail- eller Outlook-inkorg via OAuth och MailLead skickar från din vanliga e-postadress — så svaren landar där du redan jobbar.",
  },
  {
    q: "Är kalla mejl tillåtet enligt GDPR i Sverige?",
    a: "Ja, B2B-utskick till företagsadresser är tillåtet under berättigat intresse, så länge mejlen är relevanta för mottagarens roll och innehåller en tydlig avregistrering. MailLead lägger automatiskt till en avregistreringslänk i varje utskick.",
  },
  {
    q: "Hur skiljer sig MailLead från Lemlist och Instantly?",
    a: "MailLead är byggt för svenska B2B-team: gränssnitt och AI på svenska, GDPR-anpassat från grunden, och fakturering i SEK. AI:n skriver hela sekvensen — inte bara öppningsraden — så du slipper mallarbete.",
  },
  {
    q: "Kan jag testa Growth innan jag betalar?",
    a: "Starter-planen ger dig full tillgång till AI-motorn. Growth tar bara bort gränserna så att du kan skala.",
  },
  {
    q: "Hur snabbt kan jag komma igång?",
    a: "Under 10 minuter: koppla din Gmail- eller Outlook-inkorg, importera eller köp leads, och låt AI:n skriva första sekvensen. Första utskicket kan gå samma dag.",
  },
  {
    q: "Behöver jag värma upp min inkorg?",
    a: "Om du är ny eller använder en ny domän: ja, 2–4 veckor. MailLead.ai pausar automatiskt om vi ser tecken på dålig leveransbarhet och hjälper dig värma upp gradvis.",
  },
  {
    q: "Hur mycket kostar leads?",
    a: "Free-planen inkluderar 25 leads-credits. Därefter från 1,40 kr per lead i större paket. Du betalar bara för leads du verkligen vill nå — inga månadskostnader för data du inte använder.",
  },
  {
    q: "Vilka branscher passar MailLead bäst för?",
    a: "Allt B2B där beslutsfattaren har en arbets-e-postadress: SaaS, konsultverksamhet, rekrytering, byråer, industriförsäljning. Vi rekommenderar inte rena B2C-utskick.",
  },
];
