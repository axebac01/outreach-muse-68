import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Coins } from "lucide-react";
import { useCreditBalance } from "@/hooks/useCreditBalance";

export default function LeadsCreditsReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { balance } = useCreditBalance();
  const [initialBalance] = useState<number | null>(balance);
  const [confirmed, setConfirmed] = useState(false);

  // Wait for the webhook to credit the wallet
  useEffect(() => {
    if (balance !== null && initialBalance !== null && balance > initialBalance) {
      setConfirmed(true);
    }
    // Fallback: assume after 10s the webhook came through
    const t = setTimeout(() => setConfirmed(true), 12000);
    return () => clearTimeout(t);
  }, [balance, initialBalance]);

  return (
    <Layout>
      <div className="container py-16 max-w-lg">
        <Card>
          <CardContent className="py-10 text-center">
            {confirmed ? (
              <>
                <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Tack för köpet!</h1>
                <p className="text-muted-foreground mt-2">
                  Dina credits är nu tillgängliga.
                </p>
                <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-muted rounded-lg">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg">{balance ?? "—"} credits</span>
                </div>
                <div className="flex gap-2 justify-center mt-6">
                  <Link to="/leads">
                    <Button>Börja söka leads</Button>
                  </Link>
                  <Link to="/leads/credits">
                    <Button variant="outline">Köp fler</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="text-xl font-semibold">Bekräftar betalning…</h1>
                <p className="text-muted-foreground text-sm mt-2">
                  Dina credits dyker upp om ett ögonblick.
                </p>
              </>
            )}
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-6 font-mono break-all">
                {sessionId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
