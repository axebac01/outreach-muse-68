import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { toast } from "sonner";
import { Search, Linkedin, Sparkles, Coins, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ImportToSequencePicker from "@/components/leads/ImportToSequencePicker";
import MyLeadsTab from "@/components/leads/MyLeadsTab";

const CREDITS_PER_REVEAL = 2;

interface LeadPreview {
  provider_id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  linkedin_url?: string;
  city?: string;
  country?: string;
  company?: string;
  company_domain?: string;
  industry?: string;
  company_size?: number;
}

const EMPLOYEE_RANGES = [
  { value: "1,10", label: "1–10" },
  { value: "11,50", label: "11–50" },
  { value: "51,200", label: "51–200" },
  { value: "201,500", label: "201–500" },
  { value: "501,1000", label: "501–1 000" },
  { value: "1001,5000", label: "1 001–5 000" },
  { value: "5001,10000", label: "5 001–10 000" },
  { value: "10001,1000000", label: "10 000+" },
];

const SENIORITIES = [
  { value: "owner", label: "Ägare" },
  { value: "founder", label: "Grundare" },
  { value: "c_suite", label: "C-suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
];

const ROLES: { value: string; label: string; titles: string[] }[] = [
  { value: "ceo", label: "VD / CEO", titles: ["CEO", "VD", "Managing Director", "Chief Executive Officer"] },
  { value: "sales", label: "Säljchef", titles: ["Head of Sales", "Sales Director", "VP Sales", "Säljchef", "CRO", "Chief Revenue Officer"] },
  { value: "marketing", label: "Marknadschef", titles: ["CMO", "Marketing Director", "Head of Marketing", "Marknadschef"] },
  { value: "founder", label: "Grundare", titles: ["Founder", "Co-Founder", "Grundare"] },
  { value: "hr", label: "HR-chef", titles: ["HR Director", "Head of People", "CHRO", "HR-chef", "People Operations"] },
  { value: "cto", label: "IT-chef / CTO", titles: ["CTO", "Head of IT", "IT Director", "IT-chef", "Chief Technology Officer"] },
  { value: "cfo", label: "Ekonomichef / CFO", titles: ["CFO", "Finance Director", "Ekonomichef", "Head of Finance"] },
  { value: "coo", label: "Operations / COO", titles: ["COO", "Head of Operations", "Operations Director"] },
  { value: "product", label: "Produktchef", titles: ["CPO", "Head of Product", "Product Director", "Produktchef"] },
];

const INDUSTRIES: { value: string; label: string }[] = [
  { value: "5567cd4773696439b10b0000", label: "SaaS / Software" },
  { value: "5567cd4e7369644d39040000", label: "IT-tjänster" },
  { value: "5567cdda7369644d250c0000", label: "Marknadsföring / Reklam" },
  { value: "5567cdf27369643dbf260000", label: "E-handel" },
  { value: "5567cd49736964397e020000", label: "Konsulttjänster" },
  { value: "5567cdd87369644d391c0000", label: "Finans" },
  { value: "5567cdbc7369644eed130000", label: "Bygg" },
  { value: "5567cdda7369643b80510000", label: "Tillverkning" },
  { value: "5567cdde73696439dd350000", label: "Hälso- & sjukvård" },
  { value: "5567cd4d7369644d2d010000", label: "Utbildning" },
  { value: "5567cdf27369643b791f0000", label: "Fastigheter" },
  { value: "5567cdd47369644cf94c0000", label: "Restaurang / Hospitality" },
];

export default function Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { balance } = useCreditBalance();

  const [titles, setTitles] = useState("");
  const [role, setRole] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [locations, setLocations] = useState("Sweden");
  const [keywords, setKeywords] = useState("");
  const [seniority, setSeniority] = useState<string>("");
  const [employees, setEmployees] = useState<string>("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTriggered, setSearchTriggered] = useState(false);

  const [sequenceId, setSequenceId] = useState<string>("");

  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-for-import", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sequences")
        .select("id, name, status, campaign_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const search = useQuery({
    queryKey: ["leads-search", { titles, role, industry, locations, keywords, seniority, employees, page }],
    queryFn: async () => {
      // Merge free-text titles with preset role titles
      const freeTitles = titles ? titles.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const roleTitles = role ? ROLES.find((r) => r.value === role)?.titles ?? [] : [];
      const mergedTitles = Array.from(new Set([...freeTitles, ...roleTitles]));

      const { data, error } = await supabase.functions.invoke("leads-search", {
        body: {
          page,
          per_page: 25,
          q_keywords: keywords || undefined,
          person_titles: mergedTitles.length ? mergedTitles : undefined,
          person_seniorities: seniority ? [seniority] : undefined,
          organization_locations: locations
            ? locations.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          organization_num_employees_ranges: employees ? [employees] : undefined,
          organization_industry_tag_ids: industry ? [industry] : undefined,
        },
      });
      if (error) {
        // FunctionsHttpError — try to extract the JSON body for friendlier UI
        const ctx = (error as any)?.context;
        if (ctx?.json) {
          const body = await ctx.json().catch(() => null);
          if (body?.error === "apollo_plan_required") {
            const err: any = new Error(body.message);
            err.code = "apollo_plan_required";
            err.upgradeUrl = body.upgrade_url;
            throw err;
          }
          if (body?.message || body?.error) {
            throw new Error(body.message || body.error);
          }
        }
        throw error;
      }
      return data as { people: LeadPreview[]; pagination: { total_entries: number; total_pages: number } };
    },
    enabled: searchTriggered,
    retry: false,
  });

  const revealMutation = useMutation({
    mutationFn: async () => {
      const provider_ids = Array.from(selected);
      const { data, error } = await supabase.functions.invoke("leads-reveal", {
        body: { provider_ids },
      });
      if (error) throw error;
      if (data?.error === "insufficient_credits") {
        throw new Error("Du har inte tillräckligt med credits. Köp fler för att fortsätta.");
      }
      return data as { revealed: any[]; errors: any[]; balance: number };
    },
    onSuccess: async (data) => {
      toast.success(`Avslöjade ${data.revealed.length} leads`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} kunde inte hämtas (refunderade)`);
      }
      // If a sequence is selected, import them right away
      if (sequenceId && data.revealed.length > 0) {
        const { data: importRes, error: importErr } = await supabase.functions.invoke("leads-import", {
          body: {
            sequence_id: sequenceId,
            marketplace_lead_ids: data.revealed.map((l) => l.id),
          },
        });
        if (importErr) {
          toast.error("Avslöjade men kunde inte importera");
        } else {
          const seq = (sequences as any[]).find((s) => s.id === sequenceId);
          const campaignId = seq?.campaign_id ?? null;
          const action = campaignId
            ? { label: "Visa", onClick: () => navigate(`/campaign/${campaignId}`) }
            : undefined;
          if (importRes.inserted === 0 && importRes.skipped > 0) {
            toast.warning(`Alla ${importRes.total} fanns redan i sekvensen`);
          } else if (importRes.skipped > 0) {
            toast.success(`${importRes.inserted} importerade · ${importRes.skipped} fanns redan`, { action });
          } else {
            toast.success(`${importRes.inserted} importerade till sekvens`, { action });
          }
        }
      }
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["credit-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-leads"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Något gick fel");
    },
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelected(new Set());
    setSearchTriggered(true);
  };

  const toggleAll = () => {
    const people = search.data?.people ?? [];
    if (selected.size === people.length) setSelected(new Set());
    else setSelected(new Set(people.map((p) => p.provider_id)));
  };

  const totalCost = selected.size * CREDITS_PER_REVEAL;
  const canAfford = (balance ?? 0) >= totalCost;

  return (
    <Layout>
      <div className="container py-8 pb-32">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              Sök bland 270M+ verifierade B2B-kontakter från Apollo. Betala bara för de du vill ha.
            </p>
          </div>
          <Link to="/leads/credits">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Coins className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Saldo</div>
                  <div className="font-bold text-lg leading-none">
                    {balance ?? "—"} <span className="text-xs font-normal text-muted-foreground">credits</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="ml-2">
                  Köp fler
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList>
            <TabsTrigger value="search">Sök</TabsTrigger>
            <TabsTrigger value="mine">Mina leads</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Filter */}
          <form onSubmit={onSearch} className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="role">Roll</Label>
                  <Select value={role} onValueChange={(v) => setRole(v === "any" ? "" : v)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Alla roller" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla roller</SelectItem>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="industry">Bransch</Label>
                  <Select value={industry} onValueChange={(v) => setIndustry(v === "any" ? "" : v)}>
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Alla branscher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla branscher</SelectItem>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="titles">Egna titlar (kommaseparerade)</Label>
                  <Input
                    id="titles"
                    placeholder="t.ex. Head of Growth"
                    value={titles}
                    onChange={(e) => setTitles(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="locations">Land/stad</Label>
                  <Input
                    id="locations"
                    placeholder="Sweden, Stockholm"
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="seniority">Senioritet</Label>
                  <Select value={seniority} onValueChange={(v) => setSeniority(v === "any" ? "" : v)}>
                    <SelectTrigger id="seniority">
                      <SelectValue placeholder="Alla" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla</SelectItem>
                      {SENIORITIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employees">Företagsstorlek</Label>
                  <Select value={employees} onValueChange={(v) => setEmployees(v === "any" ? "" : v)}>
                    <SelectTrigger id="employees">
                      <SelectValue placeholder="Alla" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla</SelectItem>
                      {EMPLOYEE_RANGES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="keywords">Sökord</Label>
                  <Input
                    id="keywords"
                    placeholder="SaaS, fintech…"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={search.isFetching}>
                  {search.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Sök
                </Button>
              </CardContent>
            </Card>
          </form>

          {/* Results */}
          <div className="space-y-3">
            {!searchTriggered && (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="font-semibold text-lg">Börja söka bland leads</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                    Sätt dina filter till vänster. Du betalar bara {CREDITS_PER_REVEAL} credits per lead du
                    väljer att avslöja — sökning är gratis.
                  </p>
                </CardContent>
              </Card>
            )}

            {search.isLoading && searchTriggered && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            )}

            {search.isError && (() => {
              const err = search.error as any;
              if (err?.code === "apollo_plan_required") {
                return (
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardContent className="py-5 space-y-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-sm">Apollo-nyckeln behöver uppgraderas</h3>
                          <p className="text-sm text-muted-foreground mt-1">{err.message}</p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a href={err.upgradeUrl} target="_blank" rel="noopener noreferrer">
                          Uppgradera Apollo <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card className="border-destructive/40">
                  <CardContent className="py-6 text-destructive text-sm">
                    Kunde inte söka: {err?.message ?? "Okänt fel"}
                  </CardContent>
                </Card>
              );
            })()}

            {search.data && search.data.people.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Inga träffar. Prova bredare filter.
                </CardContent>
              </Card>
            )}

            {search.data && search.data.people.length > 0 && (
              <>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={
                        search.data.people.length > 0 &&
                        selected.size === search.data.people.length
                      }
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {search.data.pagination.total_entries.toLocaleString("sv-SE")} träffar
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Sida {page} / {Math.max(1, search.data.pagination.total_pages)}
                  </div>
                </div>

                {search.data.people.map((p) => (
                  <Card
                    key={p.provider_id}
                    className={`transition-colors ${
                      selected.has(p.provider_id) ? "border-primary/50 bg-primary/[0.02]" : ""
                    }`}
                  >
                    <CardContent className="py-4 flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={selected.has(p.provider_id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selected);
                          if (checked) next.add(p.provider_id);
                          else next.delete(p.provider_id);
                          setSelected(next);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{p.name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}</span>
                          {p.linkedin_url && (
                            <a
                              href={p.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {p.title}
                          {p.company && <> · <span className="text-foreground/80">{p.company}</span></>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {p.industry && (
                            <Badge variant="secondary" className="text-[10px] font-normal">{p.industry}</Badge>
                          )}
                          {p.company_size && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {p.company_size} anställda
                            </Badge>
                          )}
                          {(p.city || p.country) && (
                            <span className="text-xs text-muted-foreground">
                              {[p.city, p.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {p.company_domain && (
                            <a
                              href={`https://${p.company_domain.replace(/^https?:\/\//, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {p.company_domain.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || search.isFetching}
                  >
                    Föregående
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={
                      search.isFetching || page >= (search.data?.pagination.total_pages ?? 1)
                    }
                  >
                    Nästa
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sticky footer when leads are selected */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-40 shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.08)]">
            <div className="container py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Valda</div>
                  <div className="font-semibold">{selected.size} leads</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-sm text-muted-foreground">Kostnad</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" /> {totalCost} credits
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <ImportToSequencePicker
                  sequences={sequences as any}
                  value={sequenceId}
                  onChange={setSequenceId}
                  className="w-[240px]"
                  placeholder="Importera till sekvens (valfritt)"
                />
                <Button variant="ghost" onClick={() => setSelected(new Set())}>
                  Avmarkera
                </Button>
                {!canAfford ? (
                  <Button onClick={() => navigate("/leads/credits")}>
                    Köp credits ({totalCost - (balance ?? 0)} saknas)
                  </Button>
                ) : (
                  <Button
                    onClick={() => revealMutation.mutate()}
                    disabled={revealMutation.isPending}
                    className="gap-2"
                  >
                    {revealMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Avslöja {sequenceId ? "& importera" : ""}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
