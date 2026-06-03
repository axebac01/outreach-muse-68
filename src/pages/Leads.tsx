import { useEffect, useState } from "react";
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
import { Search, Sparkles, Coins, Loader2, ExternalLink, Mail, Phone, MapPin, Building2, Lock, CheckCircle2, Linkedin, ChevronDown, History, X, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ImportToSequencePicker from "@/components/leads/ImportToSequencePicker";
import MyLeadsTab from "@/components/leads/MyLeadsTab";

const MAX_BULK_SELECT = 500;


const CREDITS_PER_REVEAL = 2;

interface LeadPreview {
  provider_id: string;
  first_name?: string;
  last_name_obfuscated?: string;
  name?: string;
  title?: string | null;
  company?: string;
  has_email?: boolean;
  has_direct_phone?: boolean;
  has_location?: boolean;
  has_industry?: boolean;
  has_employee_count?: boolean;
  last_refreshed_at?: string | null;
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

  // Persisted filter state
  const FILTERS_KEY = "leads:filters:v1";
  const initialFilters = (() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(FILTERS_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Helper för migrering: gammalt single-value (string) -> array
  const toArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && !!x);
    if (typeof v === "string" && v) return [v];
    return [];
  };

  const [titles, setTitles] = useState<string>(initialFilters?.titles ?? "");
  const [roles, setRoles] = useState<string[]>(toArr(initialFilters?.roles ?? initialFilters?.role));
  const [industries, setIndustries] = useState<string[]>(toArr(initialFilters?.industries ?? initialFilters?.industry));
  const [locations, setLocations] = useState<string>(initialFilters?.locations ?? "Sweden");
  const [keywords, setKeywords] = useState<string>(initialFilters?.keywords ?? "");
  const [seniorities, setSeniorities] = useState<string[]>(toArr(initialFilters?.seniorities ?? initialFilters?.seniority));
  const [employeesRanges, setEmployeesRanges] = useState<string[]>(toArr(initialFilters?.employeesRanges ?? initialFilters?.employees));
  const [page, setPage] = useState<number>(initialFilters?.page ?? 1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTriggered, setSearchTriggered] = useState<boolean>(initialFilters?.searchTriggered ?? false);

  const [sequenceId, setSequenceId] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ titles, roles, industries, locations, keywords, seniorities, employeesRanges, page, searchTriggered })
      );
    } catch {
      // ignore storage errors (quota, private mode)
    }
  }, [titles, roles, industries, locations, keywords, seniorities, employeesRanges, page, searchTriggered]);



  // ---------- Senaste sökningar (DB-persistens) ----------
  type FilterSnapshot = {
    titles: string;
    roles: string[];
    industries: string[];
    locations: string;
    keywords: string;
    seniorities: string[];
    employeesRanges: string[];
  };
  const sortArr = (a: string[]) => [...a].map((s) => s.trim()).filter(Boolean).sort();
  const normalizeFilters = (f: FilterSnapshot): FilterSnapshot => ({
    titles: f.titles.trim(),
    roles: sortArr(f.roles),
    industries: sortArr(f.industries),
    locations: f.locations.trim(),
    keywords: f.keywords.trim(),
    seniorities: sortArr(f.seniorities),
    employeesRanges: sortArr(f.employeesRanges),
  });
  const hashFilters = (f: FilterSnapshot): string => {
    const n = normalizeFilters(f);
    return [
      n.titles,
      n.roles.join(","),
      n.industries.join(","),
      n.locations,
      n.keywords,
      n.seniorities.join(","),
      n.employeesRanges.join(","),
    ].map((s) => s.toLowerCase()).join("|");
  };
  const filtersAreEmpty = (f: FilterSnapshot): boolean => {
    const n = normalizeFilters(f);
    return !n.titles && n.roles.length === 0 && n.industries.length === 0 && !n.keywords
      && n.seniorities.length === 0 && n.employeesRanges.length === 0
      && (!n.locations || n.locations.toLowerCase() === "sweden");
  };
  const summarizeFilters = (f: FilterSnapshot): string => {
    const parts: string[] = [];
    const roleArr = Array.isArray(f.roles) ? f.roles : [];
    const seniorityArr = Array.isArray(f.seniorities) ? f.seniorities : [];
    const indArr = Array.isArray(f.industries) ? f.industries : [];
    const empArr = Array.isArray(f.employeesRanges) ? f.employeesRanges : [];
    if (roleArr.length) parts.push(roleArr.map((v) => ROLES.find((r) => r.value === v)?.label ?? v).join(", "));
    if (f.titles?.trim()) parts.push(f.titles.trim());
    if (seniorityArr.length) parts.push(seniorityArr.map((v) => SENIORITIES.find((s) => s.value === v)?.label ?? v).join(", "));
    if (indArr.length) parts.push(indArr.map((v) => INDUSTRIES.find((i) => i.value === v)?.label ?? v).join(", "));
    if (empArr.length) parts.push(empArr.map((v) => EMPLOYEE_RANGES.find((e) => e.value === v)?.label ?? v).join(", "));
    if (f.locations?.trim()) parts.push(f.locations.trim());
    if (f.keywords?.trim()) parts.push(`"${f.keywords.trim()}"`);
    return parts.length ? parts.join(" · ") : "Sökning utan filter";
  };
  const formatRelative = (iso: string): string => {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "nyss";
    if (min < 60) return `för ${min} min sedan`;
    const h = Math.floor(min / 60);
    if (h < 24) return `för ${h} h sedan`;
    const d = Math.floor(h / 24);
    if (d === 1) return "i går";
    if (d < 7) return `för ${d} dagar sedan`;
    return new Date(iso).toLocaleDateString("sv-SE");
  };


  const [recentOpen, setRecentOpen] = useState(false);

  const recentSearches = useQuery({
    queryKey: ["recent-searches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_searches")
        .select("id, filters, total_results, updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });


  const applyRecent = (r: { filters: any }) => {
    const f = r.filters || {};
    setTitles(f.titles ?? "");
    setRole(f.role ?? "");
    setIndustry(f.industry ?? "");
    setLocations(f.locations ?? "Sweden");
    setKeywords(f.keywords ?? "");
    setSeniority(f.seniority ?? "");
    setEmployees(f.employees ?? "");
    setPage(1);
    setSelected(new Set());
    setSearchTriggered(true);
    setRecentOpen(false);
  };

  const deleteRecent = async (id: string) => {
    await supabase.from("lead_searches").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["recent-searches", user?.id] });
  };

  const clearAllRecent = async () => {
    if (!user) return;
    await supabase.from("lead_searches").delete().eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["recent-searches", user.id] });
  };





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
    staleTime: 10 * 60 * 1000, // 10 min — samma sökning refetchar inte direkt vid återbesök
    gcTime: 60 * 60 * 1000, // 1h — behåll cachen länge
  });

  // Spara sökning i DB när nytt sökresultat kommit
  useEffect(() => {
    if (!user || !search.isSuccess || !search.data) return;
    const snap: FilterSnapshot = { titles, role, industry, locations, keywords, seniority, employees };
    if (filtersAreEmpty(snap)) return;
    const filters_hash = hashFilters(snap);
    const total_results = search.data.pagination?.total_entries ?? null;
    (async () => {
      await supabase
        .from("lead_searches")
        .upsert(
          {
            user_id: user.id,
            filters: normalizeFilters(snap) as any,
            filters_hash,
            total_results,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,filters_hash" }
        );
      queryClient.invalidateQueries({ queryKey: ["recent-searches", user.id] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.isSuccess, search.dataUpdatedAt]);




  // Track which provider_ids in the current search page are already revealed
  const pageProviderIds = (search.data?.people ?? []).map((p) => p.provider_id);
  const revealedQuery = useQuery({
    queryKey: ["revealed-lookup", user?.id, pageProviderIds.sort().join(",")],
    enabled: !!user && pageProviderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_leads")
        .select("provider_id, full_name, first_name, last_name, email, title, company, phone, linkedin_url")
        .eq("user_id", user!.id)
        .eq("provider", "apollo")
        .in("provider_id", pageProviderIds);
      const map: Record<string, any> = {};
      for (const row of data ?? []) map[row.provider_id] = row;
      return map;
    },
  });

  // Locally revealed in this session (added immediately by mutation) — overrides DB lookup
  const [justRevealed, setJustRevealed] = useState<Record<string, any>>({});
  const revealedById: Record<string, any> = { ...(revealedQuery.data ?? {}), ...justRevealed };

  // Cross-page bulk selection
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"count" | "page" | "all">("count");
  const [bulkCount, setBulkCount] = useState<number>(25);
  const [collecting, setCollecting] = useState(false);
  const [viewMode, setViewMode] = useState<"total" | "new" | "saved">("total");

  const buildSearchBody = (pageNum: number) => {
    const freeTitles = titles ? titles.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const roleTitles = role ? ROLES.find((r) => r.value === role)?.titles ?? [] : [];
    const mergedTitles = Array.from(new Set([...freeTitles, ...roleTitles]));
    return {
      page: pageNum,
      per_page: 25,
      q_keywords: keywords || undefined,
      person_titles: mergedTitles.length ? mergedTitles : undefined,
      person_seniorities: seniority ? [seniority] : undefined,
      organization_locations: locations
        ? locations.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      organization_num_employees_ranges: employees ? [employees] : undefined,
      organization_industry_tag_ids: industry ? [industry] : undefined,
    };
  };

  const collectProviderIds = async (targetCount: number): Promise<string[]> => {
    // Start with current page already in cache
    const collected: string[] = [];
    const seen = new Set<string>();
    const addFrom = (people: LeadPreview[]) => {
      for (const p of people) {
        if (revealedById[p.provider_id]) continue;
        if (seen.has(p.provider_id)) continue;
        seen.add(p.provider_id);
        collected.push(p.provider_id);
        if (collected.length >= targetCount) return true;
      }
      return false;
    };
    if (search.data) {
      if (addFrom(search.data.people)) return collected;
    }
    const totalPages = search.data?.pagination.total_pages ?? 1;
    // Fetch other pages sequentially (skip current page)
    for (let p = 1; p <= totalPages; p++) {
      if (p === page) continue;
      const { data, error } = await supabase.functions.invoke("leads-search", {
        body: buildSearchBody(p),
      });
      if (error) break;
      const people = (data?.people ?? []) as LeadPreview[];
      if (addFrom(people)) return collected;
      if (people.length === 0) break;
    }
    return collected;
  };

  const applyBulkSelect = async () => {
    const totalEntries = search.data?.pagination.total_entries ?? 0;
    const currentPagePeople = search.data?.people ?? [];

    let ids: string[] = [];
    if (bulkMode === "page") {
      ids = currentPagePeople
        .filter((p) => !revealedById[p.provider_id])
        .map((p) => p.provider_id);
    } else {
      const target = Math.min(
        bulkMode === "all" ? totalEntries : bulkCount,
        MAX_BULK_SELECT,
        totalEntries
      );
      const unrevealedOnPage = currentPagePeople.filter((p) => !revealedById[p.provider_id]);
      if (unrevealedOnPage.length >= target) {
        ids = unrevealedOnPage.slice(0, target).map((p) => p.provider_id);
      } else {
        setCollecting(true);
        try {
          ids = await collectProviderIds(target);
        } finally {
          setCollecting(false);
        }
      }
    }

    setSelected(new Set(ids));
    setBulkOpen(false);
    if (ids.length === MAX_BULK_SELECT && bulkMode !== "page") {
      toast.warning(`Max ${MAX_BULK_SELECT} leads per markering — kapade där.`);
    } else if (ids.length > 0) {
      toast.success(`${ids.length} leads markerade`);
    }
  };





  const revealMutation = useMutation({
    mutationFn: async () => {
      const allIds = Array.from(selected).filter((id) => !revealedById[id]);
      if (allIds.length === 0) {
        return { revealed: [], errors: [], balance: balance ?? 0 } as { revealed: any[]; errors: any[]; balance: number };
      }
      const BATCH = 50;
      const aggregated: { revealed: any[]; errors: any[]; balance: number } = {
        revealed: [],
        errors: [],
        balance: balance ?? 0,
      };
      const toastId = allIds.length > BATCH ? toast.loading(`Avslöjar 0 / ${allIds.length}…`) : undefined;
      try {
        for (let i = 0; i < allIds.length; i += BATCH) {
          const chunk = allIds.slice(i, i + BATCH);
          const { data, error } = await supabase.functions.invoke("leads-reveal", {
            body: { provider_ids: chunk },
          });
          if (error) throw error;
          if (data?.error === "insufficient_credits") {
            aggregated.errors.push(...chunk.map((id) => ({ provider_id: id, error: "insufficient_credits" })));
            aggregated.balance = data.balance ?? aggregated.balance;
            if (toastId) toast.dismiss(toastId);
            toast.error("Slut på credits — avbröt resterande. Köp fler och försök igen.");
            break;
          }
          aggregated.revealed.push(...(data.revealed ?? []));
          aggregated.errors.push(...(data.errors ?? []));
          aggregated.balance = data.balance ?? aggregated.balance;
          if (toastId) {
            toast.loading(`Avslöjar ${Math.min(i + BATCH, allIds.length)} / ${allIds.length}…`, { id: toastId });
          }
        }
      } finally {
        if (toastId) toast.dismiss(toastId);
      }
      return aggregated;
    },

    onSuccess: async (data) => {
      // Merge revealed leads into local lookup so they show unmasked instantly in results
      if (data.revealed.length > 0) {
        setJustRevealed((prev) => {
          const next = { ...prev };
          for (const lead of data.revealed) next[lead.provider_id] = lead;
          return next;
        });
      }
      toast.success(
        data.revealed.length === 1
          ? "1 lead avslöjad — namn och mejl visas nu i listan"
          : `${data.revealed.length} leads avslöjade — namn och mejl visas nu i listan`
      );
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
      if (typeof data.balance === "number" && user) {
        queryClient.setQueryData(["credit-wallet", user.id], { balance: data.balance });
      }
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

  const visiblePeople = (() => {
    const people = search.data?.people ?? [];
    if (viewMode === "new") return people.filter((p) => !revealedById[p.provider_id]);
    if (viewMode === "saved") return people.filter((p) => !!revealedById[p.provider_id]);
    return people;
  })();

  const toggleAll = () => {
    const people = visiblePeople.filter((p) => !revealedById[p.provider_id]);
    if (people.every((p) => selected.has(p.provider_id)) && people.length > 0) setSelected(new Set());
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
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 gap-2" disabled={search.isFetching}>
                    {search.isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Sök
                  </Button>
                  {searchTriggered && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTitles("");
                        setRole("");
                        setIndustry("");
                        setLocations("Sweden");
                        setKeywords("");
                        setSeniority("");
                        setEmployees("");
                        setPage(1);
                        setSearchTriggered(false);
                        setSelected(new Set());
                        try {
                          localStorage.removeItem(FILTERS_KEY);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Rensa
                    </Button>
                  )}
                  <Popover open={recentOpen} onOpenChange={setRecentOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Senaste sökningar"
                        aria-label="Senaste sökningar"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0" align="end">
                      <div className="px-3 py-2 border-b flex items-center justify-between">
                        <span className="text-sm font-medium">Senaste sökningar</span>
                        {(recentSearches.data?.length ?? 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                            onClick={clearAllRecent}
                          >
                            <Trash2 className="h-3 w-3" />
                            Rensa alla
                          </Button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {recentSearches.isLoading ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Laddar…
                          </div>
                        ) : (recentSearches.data?.length ?? 0) === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Inga sparade sökningar än. Gör en sökning så sparas den här.
                          </div>
                        ) : (
                          recentSearches.data!.map((r: any) => (
                            <div
                              key={r.id}
                              className="group flex items-start gap-2 px-3 py-2 hover:bg-muted/60 border-b last:border-b-0"
                            >
                              <button
                                type="button"
                                onClick={() => applyRecent(r)}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="text-sm font-medium truncate">
                                  {summarizeFilters(r.filters as FilterSnapshot)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {typeof r.total_results === "number"
                                    ? `${r.total_results.toLocaleString("sv-SE")} träffar · `
                                    : ""}
                                  {formatRelative(r.updated_at)}
                                </div>
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                                onClick={() => deleteRecent(r.id)}
                                aria-label="Ta bort"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>


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
                  <Card className="border-warning/40 bg-warning/5">
                    <CardContent className="py-5 space-y-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-warning shrink-0 mt-0.5" />
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
                {(() => {
                  const pageSavedCount = search.data.people.filter((p) => !!revealedById[p.provider_id]).length;
                  const pageNewCount = search.data.people.length - pageSavedCount;
                  return (
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                      <TabsList className="h-9">
                        <TabsTrigger value="total" className="gap-2">
                          Total
                          <span className="text-xs text-muted-foreground">
                            {search.data!.pagination.total_entries.toLocaleString("sv-SE")}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="new" className="gap-2">
                          Nya
                          <span className="text-xs text-muted-foreground">{pageNewCount}</span>
                        </TabsTrigger>
                        <TabsTrigger value="saved" className="gap-2">
                          Sparade
                          <span className="text-xs text-muted-foreground">{pageSavedCount}</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  );
                })()}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border bg-background">
                      <div className="pl-2 pr-1 flex items-center">
                        <Checkbox
                          checked={(() => {
                            const selectable = visiblePeople.filter((p) => !revealedById[p.provider_id]);
                            return selectable.length > 0 && selectable.every((p) => selected.has(p.provider_id));
                          })()}
                          onCheckedChange={toggleAll}
                          disabled={visiblePeople.filter((p) => !revealedById[p.provider_id]).length === 0}
                        />
                      </div>
                      <Popover open={bulkOpen} onOpenChange={setBulkOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 gap-0.5"
                            aria-label="Markera flera"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                          <RadioGroup
                            value={bulkMode}
                            onValueChange={(v) => setBulkMode(v as "count" | "page" | "all")}
                            className="space-y-3"
                          >
                            <div className="flex items-start gap-2">
                              <RadioGroupItem value="count" id="bulk-count" className="mt-1" />
                              <div className="flex-1 space-y-2">
                                <Label htmlFor="bulk-count" className="font-medium cursor-pointer">
                                  Markera antal
                                </Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={Math.min(
                                    MAX_BULK_SELECT,
                                    search.data.pagination.total_entries
                                  )}
                                  value={bulkCount}
                                  onChange={(e) => {
                                    setBulkMode("count");
                                    const n = parseInt(e.target.value, 10);
                                    if (!isNaN(n)) setBulkCount(n);
                                  }}
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="page" id="bulk-page" />
                              <Label htmlFor="bulk-page" className="cursor-pointer flex-1">
                                Markera denna sida{" "}
                                <span className="text-muted-foreground">
                                  {search.data.people.length}
                                </span>
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="all" id="bulk-all" />
                              <Label htmlFor="bulk-all" className="cursor-pointer flex-1">
                                Markera alla{" "}
                                <span className="text-muted-foreground">
                                  {Math.min(
                                    MAX_BULK_SELECT,
                                    search.data.pagination.total_entries
                                  ).toLocaleString("sv-SE")}
                                  {search.data.pagination.total_entries > MAX_BULK_SELECT &&
                                    ` (max ${MAX_BULK_SELECT})`}
                                </span>
                              </Label>
                            </div>
                          </RadioGroup>
                          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBulkOpen(false)}
                              disabled={collecting}
                            >
                              Avbryt
                            </Button>
                            <Button size="sm" onClick={applyBulkSelect} disabled={collecting}>
                              {collecting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              ) : null}
                              Tillämpa
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {search.data.pagination.total_entries.toLocaleString("sv-SE")} träffar
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Sida {page} / {Math.max(1, search.data.pagination.total_pages)}
                  </div>
                </div>


                {visiblePeople.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-muted-foreground text-sm">
                      {viewMode === "new"
                        ? "Inga nya leads på denna sida — alla är redan sparade."
                        : "Inga sparade leads på denna sida."}
                    </CardContent>
                  </Card>
                ) : null}
                {visiblePeople.map((p) => {
                  const revealed = revealedById[p.provider_id];
                  const isRevealed = !!revealed;
                  return (
                  <Card
                    key={p.provider_id}
                    className={`transition-colors ${
                      isRevealed
                        ? "border-emerald-500/40 bg-emerald-500/[0.03] animate-in fade-in duration-300"
                        : selected.has(p.provider_id)
                        ? "border-primary/50 bg-primary/[0.02]"
                        : ""
                    }`}
                  >
                    <CardContent className="py-4 flex items-start gap-3">
                      {isRevealed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
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
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {isRevealed
                              ? revealed.full_name ||
                                `${revealed.first_name ?? ""} ${revealed.last_name ?? ""}`.trim() ||
                                "—"
                              : p.name ||
                                `${p.first_name ?? ""} ${p.last_name_obfuscated ?? ""}`.trim() ||
                                "—"}
                          </span>
                          {isRevealed ? (
                            <Badge className="text-[10px] font-normal gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 border-emerald-500/30">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Avslöjad
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal gap-1">
                              <Lock className="h-2.5 w-2.5" /> Lås upp för fullt namn
                            </Badge>
                          )}
                          {isRevealed && revealed.linkedin_url && (
                            <a
                              href={revealed.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="LinkedIn"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {isRevealed ? revealed.title ?? p.title : p.title}
                          {(isRevealed ? revealed.company : p.company) && (
                            <>
                              {" "}
                              ·{" "}
                              <span className="text-foreground/80">
                                {isRevealed ? revealed.company : p.company}
                              </span>
                            </>
                          )}
                        </div>
                        {isRevealed ? (
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                            {revealed.email && (
                              <a
                                href={`mailto:${revealed.email}`}
                                className="inline-flex items-center gap-1.5 text-foreground hover:text-primary font-medium"
                              >
                                <Mail className="h-3.5 w-3.5" /> {revealed.email}
                              </a>
                            )}
                            {revealed.phone && (
                              <a
                                href={`tel:${revealed.phone}`}
                                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                              >
                                <Phone className="h-3.5 w-3.5" /> {revealed.phone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {p.has_email && (
                              <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                                <Mail className="h-2.5 w-2.5" /> Email
                              </Badge>
                            )}
                            {p.has_direct_phone && (
                              <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                                <Phone className="h-2.5 w-2.5" /> Direktnr
                              </Badge>
                            )}
                            {p.has_location && (
                              <Badge variant="outline" className="text-[10px] font-normal gap-1">
                                <MapPin className="h-2.5 w-2.5" /> Plats
                              </Badge>
                            )}
                            {p.has_industry && (
                              <Badge variant="outline" className="text-[10px] font-normal gap-1">
                                <Building2 className="h-2.5 w-2.5" /> Bransch
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>

                  </Card>
                  );
                })}


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
          </TabsContent>

          <TabsContent value="mine" className="mt-0">
            <MyLeadsTab />
          </TabsContent>
        </Tabs>



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
