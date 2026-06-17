import SeoArticleLayout from "@/components/SeoArticleLayout";

const KallaMejl = () => (
  <SeoArticleLayout
    title="Kalla mejl 2026 — guide, mallar & verktyg för B2B-säljare"
    description="Allt du behöver veta om kalla mejl: hur du skriver, vilka regler som gäller i Sverige, mallar som faktiskt får svar och vilka verktyg som hjälper dig skala."
    path="/kalla-mejl"
    heading={<>Kalla mejl: hur du får svar utan att hamna i skräpposten</>}
    intro={
      <p>
        Kalla mejl är fortfarande en av de mest kostnadseffektiva vägarna till nya
        B2B-kunder — men bara om du gör det rätt. Här går vi igenom vad som
        fungerar 2026, vad GDPR och e-postlagen kräver, och hur du skriver
        utskick som faktiskt blir lästa och besvarade.
      </p>
    }
    sections={[
      {
        h2: "Vad är ett kallt mejl?",
        body: (
          <>
            <p>
              Ett kallt mejl är ett första kontaktmejl till någon du inte har en
              relation med — typiskt en potentiell B2B-kund. Skillnaden mot
              nyhetsbrev är att mejlet är personligt skrivet och adresserat till
              en specifik person på ett specifikt företag.
            </p>
            <p>
              Bra kalla mejl är korta (under 120 ord), relevanta för mottagarens
              roll, och slutar med en låg-friktion CTA — som "Värt 15 minuter
              nästa vecka?" istället för "Boka demo".
            </p>
          </>
        ),
      },
      {
        h2: "Är kalla mejl lagligt i Sverige?",
        body: (
          <>
            <p>
              Ja, B2B-mejl till företag är tillåtet under GDPR med stöd av
              berättigat intresse — men du måste:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mejla en arbetsrelaterad adress på en yrkesroll</li>
              <li>Vara tydlig med vem du är och varför du hör av dig</li>
              <li>Ha en fungerande avregistreringslänk i varje mejl</li>
              <li>Respektera opt-out direkt vid första begäran</li>
            </ul>
            <p>
              Mejl till privatpersoner kräver opt-in. Vid tveksamhet: håll dig
              till företagsadresser och beslutsfattarroller.
            </p>
          </>
        ),
      },
      {
        h2: "Mall: kallt mejl som får svar",
        body: (
          <>
            <p>Ett enkelt ramverk som fungerar för de flesta säljteam:</p>
            <pre className="rounded-lg bg-muted/50 p-4 text-sm overflow-x-auto whitespace-pre-wrap">
{`Ämne: Snabb fråga om {företag}s outbound

Hej {förnamn},

Såg att ni på {företag} växer snabbt — grattis till {trigger}.

Vi hjälper B2B-team som er att skala kalla mejl utan att tappa
personlighet. Skulle 15 minuter nästa vecka vara värt din tid?

/ {min_signatur}`}
            </pre>
            <p>
              Nyckeln är <strong>triggern</strong>: en konkret detalj som visar
              att mejlet är skrivet just till dem (nyrekrytering, expansion,
              produktlansering). Det är där AI-verktyg som MailLead.ai sparar dig
              flera timmar per dag.
            </p>
          </>
        ),
      },
      {
        h2: "Verktyg & nästa steg",
        body: (
          <p>
            För att lyckas i större skala behöver du tre saker: en kvalificerad
            leadlista, ett verktyg som personifierar mejlen, och inkorgar med
            bra leveransbarhet (SPF, DKIM, DMARC). MailLead.ai täcker alla tre i
            ett gränssnitt — köp leads, generera personliga sekvenser och
            skicka från dina egna Gmail-, Outlook- eller SMTP-konton.
          </p>
        ),
      },
    ]}
    faqs={[
      {
        q: "Hur många kalla mejl kan jag skicka per dag?",
        a: "Som tumregel: max 50 per inkorg och dag när du är ny, upp till 200–500 när du värmt upp inkorgen i 4–6 veckor. MailLead.ai pausar automatiskt om bounce-raten närmar sig farliga nivåer.",
      },
      {
        q: "Måste jag ha avregistreringslänk i B2B-mejl?",
        a: "Ja — både GDPR och svensk marknadsföringslag kräver det, även för rena B2B-utskick. MailLead.ai lägger till länken automatiskt.",
      },
      {
        q: "Vad är en bra svarsfrekvens?",
        a: "För kalla mejl i Sverige ligger genomsnittet på 1–3 % positiv svarsfrekvens. Personligt skrivna utskick (med AI eller manuellt) når ofta 8–12 %.",
      },
    ]}
    related={[
      { to: "/b2b-leads-sverige", label: "Köp B2B-leads i Sverige — guide" },
      { to: "/e-postutskick-foretag", label: "E-postutskick till företag" },
    ]}
  />
);

export default KallaMejl;
