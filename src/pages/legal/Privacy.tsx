import LegalPage from "@/components/legal/LegalPage";
import { LEGAL } from "@/config/legal";

const Privacy = () => (
  <LegalPage title="Integritetspolicy">
    <p>
      {LEGAL.companyName} ("vi", "oss") tillhandahåller {LEGAL.productName} —
      en plattform för B2B-utskick via e-post. Denna policy beskriver vilka
      personuppgifter vi behandlar, varför, och vilka rättigheter du har enligt
      EU:s dataskyddsförordning (GDPR).
    </p>

    <h2>1. Personuppgiftsansvar</h2>
    <p>
      När du som <strong>kund</strong> använder {LEGAL.productName} är vi
      personuppgiftsbiträde för de leads och mejlinnehåll du laddar upp — du
      är personuppgiftsansvarig. För ditt eget konto (namn, e-post, betalning)
      är vi personuppgiftsansvariga.
    </p>
    <p>
      När du som <strong>mottagare</strong> av ett mejl skickat via {LEGAL.productName}
      vill utöva dina rättigheter, vidarebefordrar vi din förfrågan till vår
      kund (avsändaren) som är personuppgiftsansvarig för utskicket. Använd vårt{" "}
      <a href="/dsr">formulär för datarättigheter</a>.
    </p>

    <h2>2. Vilka uppgifter vi behandlar</h2>
    <ul>
      <li><strong>Kontouppgifter</strong>: namn, e-post, lösenord (hashat).</li>
      <li><strong>Anslutna mejlkonton</strong>: OAuth-tokens (Gmail/Outlook) eller SMTP-uppgifter (krypterade med AES via pgcrypto).</li>
      <li><strong>Inkorgens innehåll</strong>: vi läser inkommande mejl till anslutna konton för att kunna visa svar i appen och pausa sekvenser vid svar.</li>
      <li><strong>Leads</strong>: e-postadress, namn, företag, roll, telefon och annan information du laddar upp.</li>
      <li><strong>Mejlinnehåll vi skickat</strong>: subject, body, status, tidsstämplar.</li>
      <li><strong>Besökslogg</strong> (om du har ställt in spårning av din egen domän): IP-adress, user agent, sidvisning. IP:n anonymiseras efter geo-lookup.</li>
      <li><strong>Användningsdata</strong>: tekniska loggar och felmeddelanden för felsökning.</li>
    </ul>

    <h2>3. Rättslig grund</h2>
    <ul>
      <li>Avtalsuppfyllelse (art. 6.1 b): att tillhandahålla tjänsten.</li>
      <li>Berättigat intresse (art. 6.1 f): säkerhet, missbrukshantering, produktförbättring.</li>
      <li>Rättslig förpliktelse (art. 6.1 c): bokföring, hantering av DSR-förfrågningar.</li>
    </ul>

    <h2>4. AI-bearbetning</h2>
    <p>
      När du använder AI-funktioner (sekvensgenerering, "förbättra steg",
      företagsanalys) skickas relevant text till Google (Gemini) och/eller
      OpenAI via vår AI-gateway. Vi skickar <strong>inte</strong> hela din
      databas — bara den prompt som hör till åtgärden. Leverantörerna får
      inte använda data till modellträning.
    </p>

    <h2>5. Lagringstid</h2>
    <ul>
      <li>Aktiva konton: så länge avtalet löper.</li>
      <li>Mejlinnehåll (skickat och mottaget): som standard 12 månader, sedan automatisk radering. Kund kan konfigurera kortare retention.</li>
      <li>Besökslogg: 90 dagar.</li>
      <li>Bokföringsmaterial: 7 år (bokföringslagen).</li>
      <li>Konto raderas senast 30 dagar efter uppsägning.</li>
    </ul>

    <h2>6. Underbiträden</h2>
    <p>
      Vi anlitar underleverantörer (Supabase, Lovable, Google, Microsoft,
      OpenAI, IPinfo). Se vår fullständiga{" "}
      <a href="/legal/subprocessors">lista över underbiträden</a>. Överföringar
      utanför EU/EES sker med EU-kommissionens standardavtalsklausuler (SCC).
    </p>

    <h2>7. Dina rättigheter</h2>
    <p>
      Du har rätt till tillgång, rättelse, radering, begränsning, invändning
      och dataportabilitet. Skicka in din begäran via{" "}
      <a href="/dsr">/dsr</a> eller mejla{" "}
      <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. Vi
      svarar inom 30 dagar. Du har också rätt att klaga hos
      Integritetsskyddsmyndigheten (IMY).
    </p>

    <h2>8. Säkerhet</h2>
    <p>
      Vi använder kryptering i transit (TLS) och i vila (för SMTP-credentials).
      Lösenord lagras hashade. Vi loggar säkerhetsrelevanta händelser och
      kontrollerar åtkomst med Row-Level Security i databasen.
    </p>

    <h2>9. Personuppgiftsincident</h2>
    <p>
      Vid en incident som sannolikt medför risk för registrerade anmäler vi
      till IMY inom 72 timmar och informerar berörda kunder utan onödigt
      dröjsmål.
    </p>

    <h2>10. Kontakt</h2>
    <p>
      {LEGAL.companyName}, {LEGAL.address}. E-post:{" "}
      <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> (integritet),{" "}
      <a href={`mailto:${LEGAL.dpoEmail}`}>{LEGAL.dpoEmail}</a> (dataskyddsombud).
    </p>
  </LegalPage>
);

export default Privacy;
