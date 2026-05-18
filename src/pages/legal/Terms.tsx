import LegalPage from "@/components/legal/LegalPage";
import { LEGAL } from "@/config/legal";

const Terms = () => (
  <LegalPage title="Användarvillkor">
    <p>
      Dessa villkor gäller för din användning av {LEGAL.productName} som
      tillhandahålls av {LEGAL.companyName} ("vi"). Genom att skapa ett konto
      godkänner du villkoren.
    </p>

    <h2>1. Tjänsten</h2>
    <p>
      {LEGAL.productName} är ett verktyg för B2B-utskick via e-post som tillåter
      dig att ansluta egna mejlkonton, importera leads, skriva sekvenser och
      följa upp svar.
    </p>

    <h2>2. Användarens skyldigheter (Acceptable Use)</h2>
    <p>Du <strong>får inte</strong> använda {LEGAL.productName} för att:</p>
    <ul>
      <li>Skicka spam, kedjebrev eller olagligt innehåll.</li>
      <li>Skicka utskick till personer utan laglig grund enligt GDPR.</li>
      <li>Skicka utskick till privatpersoner (B2C) utan uttryckligt samtycke.</li>
      <li>Marknadsföra olagliga varor/tjänster, vapen, droger, vuxenmaterial, kryptobedrägerier eller liknande.</li>
      <li>Använda inköpta listor av tveksam härkomst.</li>
      <li>Förfalska avsändaridentitet eller bryta mot ePrivacy-direktivet.</li>
      <li>Försöka kringgå sändningsgränser, rate limits eller suppression-listor.</li>
    </ul>
    <p>
      Vi kan stänga av konton som bryter mot dessa regler utan förvarning eller
      återbetalning. Vid spam-klagomål över en viss tröskel stängs kontot
      automatiskt av i avvaktan på utredning.
    </p>

    <h2>3. Avgifter</h2>
    <p>
      Priser anges på <a href="/pricing">prissidan</a>. Avgifter debiteras i
      förskott per månad eller år. Moms tillkommer enligt gällande regler.
      Återbetalning sker inte för påbörjad period förutom där tvingande lag
      kräver det.
    </p>

    <h2>4. Uppsägning</h2>
    <p>
      Du kan säga upp ditt abonnemang när som helst via Inställningar →
      Faktura. Vi kan säga upp ditt konto med 30 dagars varsel eller omedelbart
      vid brott mot dessa villkor.
    </p>

    <h2>5. Immateriella rättigheter</h2>
    <p>
      Vi äger all kod, design och dokumentation i {LEGAL.productName}. Du
      äger ditt eget innehåll (leads, mejltexter, sekvenser).
    </p>

    <h2>6. Ansvarsbegränsning</h2>
    <p>
      Tjänsten levereras "as is". Vi garanterar inte avbrottsfri drift eller
      att utskick når mottagaren (deliverability beror i hög grad på din
      domäns rykte och innehåll). Vårt totala skadeståndsansvar är begränsat
      till det belopp du har betalat under de senaste 12 månaderna.
    </p>

    <h2>7. Personuppgifter</h2>
    <p>
      Vi behandlar personuppgifter enligt vår{" "}
      <a href="/legal/privacy">integritetspolicy</a>. För B2B-kunder ingås
      även ett personuppgiftsbiträdesavtal (DPA) — kontakta{" "}
      <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
    </p>

    <h2>8. Ändringar</h2>
    <p>
      Vi kan uppdatera villkoren. Vid materiella ändringar meddelar vi minst
      30 dagar i förväg via e-post. Fortsatt användning räknas som godkännande.
    </p>

    <h2>9. Tillämplig lag och tvist</h2>
    <p>
      Svensk lag gäller. Tvist avgörs i svensk allmän domstol med Stockholms
      tingsrätt som första instans.
    </p>

    <h2>10. Kontakt</h2>
    <p>
      {LEGAL.companyName}, {LEGAL.address}.{" "}
      <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
    </p>
  </LegalPage>
);

export default Terms;
