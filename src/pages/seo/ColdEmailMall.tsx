import SeoArticleLayout from "@/components/SeoArticleLayout";

const TEMPLATES: { title: string; subject: string; body: string }[] = [
  {
    title: "1. Klassiker: Snabb fråga + trigger",
    subject: "Snabb fråga om {företag}s outbound",
    body: `Hej {förnamn},

Såg att ni på {företag} {trigger}. Grattis!

Vi hjälper B2B-team som er att skala kalla mejl utan att tappa
personlighet — AI:n skriver sekvenserna på svenska så ni slipper
mallarbete.

Skulle 15 minuter nästa vecka vara värt din tid?

/ {min_signatur}`,
  },
  {
    title: "2. Värdeerbjudande: konkret resultat",
    subject: "{företag} → 3x fler bokade möten?",
    body: `Hej {förnamn},

Vi har hjälpt {liknande_företag} gå från ca 5 till 18 bokade möten
per månad — utan att anställa fler SDRs.

Värt 10 minuter för att visa hur vi gjorde?

/ {min_signatur}`,
  },
  {
    title: "3. Mjuk följduppmaning (dag 4)",
    subject: "Re: Snabb fråga om {företag}s outbound",
    body: `Hej {förnamn},

Hoppade upp i din inkorg igen — vet att veckan är full.

Är det ens rätt person att prata med? Om någon annan ansvarar för
outbound hos er pekar du gärna mig vidare.

/ {min_signatur}`,
  },
  {
    title: "4. Sista försök (dag 10)",
    subject: "Stänger loopen, {förnamn}",
    body: `Hej {förnamn},

Sista mejlet från mig — vill inte fylla din inkorg i onödan.

Om outbound är aktuellt om 3–6 månader: svara bara "ping mig då" så
återkommer jag. Annars önskar jag dig en bra höst!

/ {min_signatur}`,
  },
];

const ColdEmailMall = () => (
  <SeoArticleLayout
    title="Cold email-mall: 4 mallar för B2B som faktiskt får svar (2026)"
    description="Färdiga cold email-mallar på svenska för B2B-säljare: öppningsmejl, värdeerbjudande, följduppmaning och break-up. Med ämnesrader och variabler du kan kopiera direkt."
    path="/cold-email-mall"
    heading={<>4 cold email-mallar som faktiskt får svar</>}
    intro={
      <p>
        Här är fyra färdiga mallar för B2B-utskick på svenska — beprövade
        ramverk vi sett fungera över tusentals kampanjer. Kopiera, byt ut
        variablerna, anpassa tonen, och du har en hel sekvens redo att
        skicka.
      </p>
    }
    sections={[
      ...TEMPLATES.map((t) => ({
        h2: t.title,
        body: (
          <>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Ämne:</strong> {t.subject}
            </p>
            <pre className="rounded-lg bg-muted/50 p-4 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
              {t.body}
            </pre>
          </>
        ),
      })),
      {
        h2: "Så använder du mallarna",
        body: (
          <>
            <p>
              Mallarna är utgångspunkter — inte recept. För att slippa låta
              som en bot bör du:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Byta ut {"{trigger}"}</strong> mot något konkret: "anställde två SDRs i augusti", "lanserade nya produkten Foo", "öppnade kontor i Göteborg".</li>
              <li><strong>Hålla mejlet under 120 ord</strong> — det är gränsen där svarsfrekvensen rasar.</li>
              <li><strong>Be om något litet</strong> — "15 min" eller "rätt person?" får svar; "boka demo" gör inte det.</li>
            </ul>
            <p>
              MailLead.ai:s AI gör steg 1 automatiskt — den läser ditt leads
              företag och föreslår en relevant trigger per kontakt. Då
              skickar du 100 personliga mejl på samma tid som 10 manuellt.
            </p>
          </>
        ),
      },
    ]}
    faqs={[
      {
        q: "Får jag använda mallarna kommersiellt?",
        a: "Ja, mallarna är fria att använda. Anpassa dem efter er ton och bransch — kopiera-klistra utan ändring presterar alltid sämre.",
      },
      {
        q: "Hur lång ska en cold email-sekvens vara?",
        a: "3–5 mejl över 2–3 veckor är optimalt för svenska B2B-mottagare. Längre sekvenser irriterar; kortare ger för få touchpoints.",
      },
      {
        q: "Vad är en bra ämnesrad?",
        a: "Kort (under 6 ord), nyfikenhetsväckande, gärna med mottagarens företagsnamn. Undvik versaler, utropstecken och säljklyschor — de triggar spamfilter.",
      },
    ]}
    related={[
      { to: "/kalla-mejl", label: "Kalla mejl — komplett guide" },
      { to: "/b2b-leads-sverige", label: "Köp B2B-leads i Sverige" },
      { to: "/jamfor/maillead-vs-lemlist", label: "MailLead.ai vs Lemlist" },
    ]}
  />
);

export default ColdEmailMall;
