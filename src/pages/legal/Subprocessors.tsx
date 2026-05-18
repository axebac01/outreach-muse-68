import LegalPage from "@/components/legal/LegalPage";
import { LEGAL, SUBPROCESSORS } from "@/config/legal";

const Subprocessors = () => (
  <LegalPage title="Underbiträden">
    <p>
      Vi anlitar följande underbiträden för att tillhandahålla{" "}
      {LEGAL.productName}. Listan uppdateras vid förändringar och kunder
      meddelas minst 30 dagar i förväg vid nytt underbiträde.
    </p>

    <table className="not-prose w-full text-sm border rounded-md overflow-hidden">
      <thead className="bg-muted">
        <tr>
          <th className="text-left p-3 font-medium">Leverantör</th>
          <th className="text-left p-3 font-medium">Syfte</th>
          <th className="text-left p-3 font-medium">Region</th>
        </tr>
      </thead>
      <tbody>
        {SUBPROCESSORS.map((s) => (
          <tr key={s.name} className="border-t">
            <td className="p-3 font-medium">{s.name}</td>
            <td className="p-3 text-muted-foreground">{s.purpose}</td>
            <td className="p-3 text-muted-foreground">{s.location}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <h2>Överföringar utanför EU</h2>
    <p>
      Där underbiträdet är etablerat utanför EU/EES sker överföringar med
      EU-kommissionens standardavtalsklausuler (SCC) som rättslig grund,
      kompletterat med tekniska skyddsåtgärder.
    </p>

    <h2>Invändning mot nytt underbiträde</h2>
    <p>
      Som kund kan du invända mot ett nytt underbiträde inom 14 dagar från
      meddelandet genom att kontakta{" "}
      <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. Vid
      invändning som vi inte kan lösa har du rätt att säga upp avtalet utan
      kostnad.
    </p>
  </LegalPage>
);

export default Subprocessors;
