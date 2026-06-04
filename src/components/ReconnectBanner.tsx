import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useEmailAccounts } from "@/hooks/useEmailAccounts";

/**
 * Visas överst i appen när minst ett mejlkonto behöver återanslutas.
 * Klicket leder till /email-accounts där användaren kan trigga reconnect.
 */
export const ReconnectBanner = () => {
  const { data: accounts } = useEmailAccounts();
  const broken = (accounts ?? []).filter(
    (a) => a.status === "error" || a.status === "needs_reconnect",
  );
  if (broken.length === 0) return null;

  const first = broken[0];
  const msg =
    broken.length === 1
      ? `Mejlkontot ${first.email} behöver återanslutas.`
      : `${broken.length} mejlkonton behöver återanslutas.`;

  return (
    <Link
      to="/email-accounts"
      className="block bg-destructive/10 border-b border-destructive/30 text-destructive hover:bg-destructive/15 transition-colors"
    >
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">{msg}</span>
        <span className="text-destructive/80">Klicka för att fixa →</span>
      </div>
    </Link>
  );
};
