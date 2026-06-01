import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "maillead-cookie-consent";

type Consent = "accepted" | "rejected";

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Consent | null;
      if (!v) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (choice: Consent) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* no-op */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-meddelande"
      className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="container py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Vi använder endast nödvändiga cookies för att hålla dig inloggad och
          för att appen ska fungera. Vi sätter inga marknadsförings- eller
          analyscookies. Läs mer i vår{" "}
          <Link to="/legal/cookies" className="underline">
            cookie-policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => decide("rejected")}>
            Endast nödvändiga
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Okej
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
