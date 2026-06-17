import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Coins, Inbox } from "lucide-react";
import { toast } from "sonner";
import ImportToSequencePicker from "./ImportToSequencePicker";

interface MarketplaceLead {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
  company?: string | null;
  cost_credits: number;
  revealed_at: string;
}

interface Sequence {
  id: string;
  name: string;
}

export default function MyLeadsTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sequenceId, setSequenceId] = useState<string>("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["marketplace-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_leads")
        .select("id, full_name, first_name, last_name, email, title, company, cost_credits, revealed_at")
        .order("revealed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as MarketplaceLead[];
    },
    enabled: !!user,
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-for-import", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sequences")
        .select("id, name, campaign_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as (Sequence & { campaign_id: string | null })[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.full_name, l.first_name, l.last_name, l.email, l.company, l.title]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [leads, filter]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!sequenceId) throw new Error("Välj en sekvens först");
      const ids = Array.from(selected);
      const { data, error } = await supabase.functions.invoke("leads-import", {
        body: { sequence_id: sequenceId, marketplace_lead_ids: ids },
      });
      if (error) throw error;
      return data as { inserted: number; skipped: number; total: number };
    },
    onSuccess: (data) => {
      const seq = sequences.find((s) => s.id === sequenceId);
      const campaignId = seq?.campaign_id ?? null;

      if (data.inserted === 0 && data.skipped > 0) {
        toast.warning(`Alla ${data.total} leads fanns redan i sekvensen`);
      } else if (data.skipped > 0) {
        toast.success(`${data.inserted} importerade · ${data.skipped} fanns redan`, {
          action: campaignId
            ? { label: "Visa", onClick: () => navigate(`/campaign/${campaignId}`) }
            : undefined,
        });
      } else {
        toast.success(`${data.inserted} importerade`, {
          action: campaignId
            ? { label: "Visa", onClick: () => navigate(`/campaign/${campaignId}`) }
            : undefined,
        });
      }
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["sequences-for-import"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Kunde inte importera");
    },
  });

  return (
    <div className="space-y-4 pb-32">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök bland dina köpta leads…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="font-normal">
          {leads.length} totalt
        </Badge>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && leads.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Inga köpta leads än</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
              När du avslöjar leads i Sök-fliken sparas de här så du kan importera dem
              till en kampanj senare.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && leads.length > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Inga träffar för "{filter}".
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && (
        <>
          <div className="flex items-center gap-3 px-1">
            <Checkbox
              checked={selected.size > 0 && selected.size === filtered.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} valda`
                : `Visar ${filtered.length} leads`}
            </span>
          </div>

          {filtered.map((l) => {
            const name =
              l.full_name ||
              `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() ||
              l.email ||
              "Okänd";
            return (
              <Card
                key={l.id}
                className={`transition-colors ${
                  selected.has(l.id) ? "border-primary/50 bg-primary/[0.02]" : ""
                }`}
              >
                <CardContent className="py-3 flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(l.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selected);
                      if (checked) next.add(l.id);
                      else next.delete(l.id);
                      setSelected(next);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{name}</span>
                      {l.email && (
                        <span className="text-xs text-muted-foreground">{l.email}</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {l.title}
                      {l.company && <> · <span className="text-foreground/80">{l.company}</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">
                      {new Date(l.revealed_at).toLocaleDateString("sv-SE")}
                    </div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                      <Coins className="h-3 w-3" /> {l.cost_credits}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Sticky import footer */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-40 shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.08)]">
          <div className="container py-3 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-muted-foreground">Valda</div>
              <div className="font-semibold">{selected.size} leads</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ImportToSequencePicker
                sequences={sequences}
                value={sequenceId}
                onChange={setSequenceId}
                placeholder="Välj sekvens"
              />
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Avmarkera
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || !sequenceId}
                className="gap-2"
              >
                {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Importera
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
