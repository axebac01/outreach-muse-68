import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const KEY = "ml.cookieConsent.v1";

type Choice = "accepted" | "rejected" | null;

export const CookieConsent = () => {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Choice;
    setChoice(stored);
    setReady(true);
  }, []);

  const decide = (c: "accepted" | "rejected") => {
    localStorage.setItem(KEY, c);
    setChoice(c);
  };

  if (!ready || choice) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-samtycke"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 rounded-lg border bg-background shadow-lg p-4 space-y-3"
    >
      <div className="text-sm">
        Vi använder bara nödvändiga cookies för att appen ska fungera (inloggning,
        spårning av besök på era egna spårade domäner). Vi använder{" "}
        <strong>inga</strong> marknadsförings- eller analys-cookies för tredje part.
        Läs mer i vår{" "}
        <Link to="/legal/cookies" className="underline">cookie-policy</Link>.
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => decide("rejected")}>
          Avvisa valbara
        </Button>
        <Button size="sm" onClick={() => decide("accepted")}>
          Acceptera
        </Button>
      </div>
    </div>
  );
};

export default CookieConsent;
