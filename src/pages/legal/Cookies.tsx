import LegalPage from "@/components/legal/LegalPage";
import { LEGAL } from "@/config/legal";

const Cookies = () => (
  <LegalPage title="Cookie-policy">
    <p>
      Denna policy beskriver vilka cookies och liknande tekniker som används
      på {LEGAL.website} och i applikationen {LEGAL.productName}.
    </p>

    <h2>Vad är en cookie?</h2>
    <p>
      En cookie är en liten textfil som lagras i din webbläsare. Vi använder
      även localStorage för att spara dina preferenser.
    </p>

    <h2>Vilka cookies använder vi?</h2>

    <h3>Nödvändiga (alltid aktiva)</h3>
    <ul>
      <li>
        <strong>Inloggning</strong>: Supabase Auth lagrar en session-token i
        localStorage så att du kan vara inloggad.
      </li>
      <li>
        <strong>UI-preferenser</strong>: ditt val av språk, tema och om du
        bekräftat laglig grund för leads.
      </li>
      <li>
        <strong>Cookie-samtycke</strong>: ditt val sparas så att vi inte
        frågar igen vid nästa besök.
      </li>
    </ul>

    <h3>Statistik (endast om du accepterat)</h3>
    <p>
      Idag använder vi <strong>inga</strong> tredjeparts-analystjänster på
      vår marknadssida (ingen Google Analytics, ingen Meta-pixel). Om vi
      lägger till en sådan i framtiden uppdaterar vi denna policy och
      återinhämtar samtycke.
    </p>

    <h3>Besöksspårning på kundens sajter</h3>
    <p>
      När en av våra kunder integrerar vårt tracking-script på sin egen
      webbplats sätter scriptet en första-parts-identifierare. Detta sker
      på kundens sajt — inte på vår — och styrs av kundens egen
      cookie-policy.
    </p>

    <h2>Hantera dina val</h2>
    <p>
      Du kan när som helst rensa cookies via din webbläsares inställningar.
      Att blockera nödvändiga cookies gör att du inte kan logga in.
    </p>

    <h2>Kontakt</h2>
    <p>
      Frågor? Mejla{" "}
      <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
    </p>
  </LegalPage>
);

export default Cookies;
