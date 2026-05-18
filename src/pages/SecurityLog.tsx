import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

type Entry = {
  id: string;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function SecurityLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id,event_type,resource_type,resource_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setEntries((data ?? []) as Entry[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Säkerhetslogg</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senaste 100 händelser</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga händelser ännu.</p>
          ) : (
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{e.event_type}</Badge>
                      {e.resource_type && (
                        <span className="text-xs text-muted-foreground">
                          {e.resource_type}
                          {e.resource_id ? `:${e.resource_id.slice(0, 8)}` : ""}
                        </span>
                      )}
                    </div>
                    {Object.keys(e.metadata || {}).length > 0 && (
                      <pre className="mt-1 text-xs text-muted-foreground truncate">
                        {JSON.stringify(e.metadata)}
                      </pre>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
