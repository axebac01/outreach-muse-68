import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInboundCompanies, useCompanyVisits, useTrackingSites } from "@/hooks/useInbound";
import { Building2, ExternalLink, Globe, Settings as SettingsIcon, MapPin, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/EmptyState";
import { formatDistanceToNow } from "date-fns";

const Inbound = () => {
  const [filter, setFilter] = useState<"all" | "known">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: companies = [], isLoading } = useInboundCompanies({ knownOnly: filter === "known" });
  const { data: sites = [] } = useTrackingSites();
  const { data: visits = [] } = useCompanyVisits(selectedId || undefined);

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || c.domain.toLowerCase().includes(s);
  });

  const selected = companies.find((c) => c.id === selectedId);

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Inbound leads</h1>
            <p className="text-muted-foreground mt-1">Företag som besökt din sajt</p>
          </div>
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/settings/tracking"><SettingsIcon className="h-4 w-4" /> Tracking-inställningar</Link>
          </Button>
        </div>

        {sites.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              title="Du har inte installerat snippeten än"
              description="Lägg till din webbplats och klistra in tracking-snippeten i headern för att börja se vilka företag som besöker dig."
              actionLabel="Kom igång"
              actionHref="/settings/tracking"
            />
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "known")}>
                <TabsList>
                  <TabsTrigger value="all">Alla företag</TabsTrigger>
                  <TabsTrigger value="known">Kända leads</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input
                placeholder="Sök företag eller domän…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {isLoading ? (
              <Card className="p-12 text-center text-muted-foreground">Laddar…</Card>
            ) : filtered.length === 0 ? (
              <Card className="p-12">
                <EmptyState
                  icon={Building2}
                  title="Inga besök ännu"
                  description="Så snart någon besöker din sajt dyker företaget upp här."
                />
              </Card>
            ) : (
              <Card className="divide-y">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{c.name || c.domain}</span>
                        {c.is_known_lead && (
                          <Badge variant="default" className="text-[10px]">Känd lead</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <span>{c.domain}</span>
                        {c.country && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.country}</span>
                        )}
                        {c.industry && <span>· {c.industry}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium flex items-center gap-1 justify-end">
                        <Eye className="h-3.5 w-3.5" /> {c.visit_count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.last_seen_at), { addSuffix: true })}
                      </div>
                    </div>
                  </button>
                ))}
              </Card>
            )}
          </>
        )}
      </div>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name || selected?.domain}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Domän</div>
                  <a href={`https://${selected.domain}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {selected.domain} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Antal besök</div>
                  <div>{selected.visit_count}</div>
                </div>
                {selected.country && (
                  <div>
                    <div className="text-muted-foreground text-xs">Land</div>
                    <div>{selected.country}{selected.city ? `, ${selected.city}` : ""}</div>
                  </div>
                )}
                {selected.industry && (
                  <div>
                    <div className="text-muted-foreground text-xs">Bransch</div>
                    <div>{selected.industry}</div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Besökshistorik</h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {visits.map((v) => (
                    <div key={v.id} className="text-xs border rounded p-2">
                      <div className="font-medium truncate">{v.path || v.url}</div>
                      <div className="text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                        {v.referrer && <span> · från {new URL(v.referrer).hostname}</span>}
                        {v.utm_source && <span> · utm: {v.utm_source}</span>}
                      </div>
                    </div>
                  ))}
                  {visits.length === 0 && <div className="text-xs text-muted-foreground">Inga besök loggade</div>}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default Inbound;
