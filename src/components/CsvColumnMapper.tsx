import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Sparkles, Wand2, Eraser } from "lucide-react";
import { classifyRecipient, sanitizeName } from "@/lib/emailAddressQuality";

export type LeadField =
  | "email"
  | "full_name"
  | "first_name"
  | "last_name"
  | "role"
  | "phone"
  | "company"
  | "website"
  | "ignore";

export const LEAD_FIELDS: { value: LeadField; label: string }[] = [
  { value: "email", label: "E-post" },
  { value: "full_name", label: "Fullständigt namn" },
  { value: "first_name", label: "Förnamn" },
  { value: "last_name", label: "Efternamn" },
  { value: "role", label: "Roll / titel" },
  { value: "phone", label: "Telefon" },
  { value: "company", label: "Företag" },
  { value: "website", label: "Webbplats" },
  { value: "ignore", label: "— ignorera —" },
];

const normalizeHeader = (h: string) =>
  h
    .toLowerCase()
    .trim()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const deAccent = (s: string) =>
  s.replace(/å|ä/g, "a").replace(/ö/g, "o").replace(/é/g, "e");

/** Exact header matches (normalized) */
const HEADER_EXACT: Record<string, LeadField> = {
  email: "email",
  "email address": "email",
  "e mail": "email",
  mail: "email",
  "e post": "email",
  epost: "email",
  "e postadress": "email",
  epostadress: "email",
  name: "full_name",
  namn: "full_name",
  "full name": "full_name",
  fullname: "full_name",
  "contact name": "full_name",
  kontaktperson: "full_name",
  kontakt: "full_name",
  "first name": "first_name",
  firstname: "first_name",
  fname: "first_name",
  fornamn: "first_name",
  "last name": "last_name",
  lastname: "last_name",
  lname: "last_name",
  surname: "last_name",
  efternamn: "last_name",
  role: "role",
  roll: "role",
  title: "role",
  titel: "role",
  "job title": "role",
  position: "role",
  befattning: "role",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  telefon: "phone",
  mobil: "phone",
  tel: "phone",
  company: "company",
  organization: "company",
  organisation: "company",
  org: "company",
  employer: "company",
  arbetsgivare: "company",
  foretag: "company",
  bolag: "company",
  website: "website",
  url: "website",
  site: "website",
  webbplats: "website",
  hemsida: "website",
  webb: "website",
  webbadress: "website",
  domain: "website",
  doman: "website",
};

/** Keyword rules, evaluated in order — first match wins */
const HEADER_KEYWORDS: Array<{ field: LeadField; words: string[] }> = [
  { field: "email", words: ["email", "e mail", "epost", "e post", "mailadress"] },
  { field: "first_name", words: ["first name", "firstname", "fornamn", "given name", "fname"] },
  { field: "last_name", words: ["last name", "lastname", "efternamn", "surname", "family name", "lname"] },
  { field: "website", words: ["website", "webbplats", "hemsida", "webbadress", "web site", "homepage", "doman", "domain"] },
  { field: "phone", words: ["phone", "telefon", "mobil", "mobile", "tel nr", "telnr", "cell"] },
  { field: "company", words: ["company", "foretag", "bolag", "organisation", "organization", "employer", "arbetsgivare", "account name"] },
  { field: "role", words: ["title", "titel", "role", "roll", "position", "befattning", "job"] },
  { field: "full_name", words: ["full name", "fullname", "kontaktperson", "contact name", "namn", "name"] },
];

/** Headers that should never be auto-mapped to website */
const NON_WEBSITE_URL_HINTS = ["linkedin", "facebook", "twitter", "instagram", "profile", "profil"];

const guessFromHeader = (header: string): LeadField | null => {
  const norm = deAccent(normalizeHeader(header));
  if (!norm) return null;
  const exact = HEADER_EXACT[norm];
  if (exact) return exact;

  const isSocial = NON_WEBSITE_URL_HINTS.some((w) => norm.includes(w));
  for (const rule of HEADER_KEYWORDS) {
    if (rule.field === "website" && isSocial) continue;
    if (rule.words.some((w) => norm.includes(w))) return rule.field;
  }
  return null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
const NAME_RE = /^\p{Lu}[\p{L}'’-]+(\s+\p{Lu}[\p{L}'’-]+)+$/u;

const guessFromValues = (values: string[]): LeadField | null => {
  const sample = values.filter(Boolean).slice(0, 20);
  if (sample.length < 2) return null;
  const ratio = (fn: (v: string) => boolean) => sample.filter(fn).length / sample.length;

  if (ratio((v) => EMAIL_RE.test(v)) >= 0.7) return "email";
  if (ratio((v) => URL_RE.test(v) && !v.includes("@")) >= 0.7) return "website";
  if (ratio((v) => /^[+()\d][\d\s()+-]{6,}$/.test(v) && (v.match(/\d/g)?.length ?? 0) >= 7) >= 0.7) return "phone";
  if (ratio((v) => NAME_RE.test(v)) >= 0.7) return "full_name";
  return null;
};

const guessMapping = (
  headers: string[],
  rows: Record<string, any>[],
): { mapping: Record<string, LeadField>; auto: Record<string, boolean> } => {
  const mapping: Record<string, LeadField> = {};
  const auto: Record<string, boolean> = {};
  const used = new Set<LeadField>();

  // Pass 1: header based
  headers.forEach((h) => {
    mapping[h] = "ignore";
    auto[h] = false;
    const guess = guessFromHeader(h);
    if (guess && !used.has(guess)) {
      used.add(guess);
      mapping[h] = guess;
      auto[h] = true;
    }
  });

  // Pass 2: value based fallback
  headers.forEach((h) => {
    if (mapping[h] !== "ignore") return;
    const values = rows.map((r) => String(r[h] ?? "").trim());
    const guess = guessFromValues(values);
    if (guess && !used.has(guess)) {
      used.add(guess);
      mapping[h] = guess;
      auto[h] = true;
    }
  });

  return { mapping, auto };
};

export interface CsvColumnMapperProps {
  headers: string[];
  rows: Record<string, any>[];
  onConfirm: (mapped: Array<Record<LeadField, string>>) => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export const CsvColumnMapper = ({ headers, rows, onConfirm, onCancel, isImporting }: CsvColumnMapperProps) => {
  const initial = useMemo(() => guessMapping(headers, rows), [headers, rows]);

  const [mapping, setMapping] = useState<Record<string, LeadField>>(initial.mapping);
  const [autoMapped, setAutoMapped] = useState<Record<string, boolean>>(initial.auto);

  const autoCount = Object.values(autoMapped).filter(Boolean).length;

  const handleChange = (header: string, value: LeadField) => {
    setMapping((m) => ({ ...m, [header]: value }));
    setAutoMapped((a) => ({ ...a, [header]: false }));
  };

  const handleReguess = () => {
    const next = guessMapping(headers, rows);
    setMapping(next.mapping);
    setAutoMapped(next.auto);
  };

  const handleClearAll = () => {
    const cleared: Record<string, LeadField> = {};
    const auto: Record<string, boolean> = {};
    headers.forEach((h) => {
      cleared[h] = "ignore";
      auto[h] = false;
    });
    setMapping(cleared);
    setAutoMapped(auto);
  };

  const stats = useMemo(() => {
    const emptyStats = {
      valid: 0,
      invalid: rows.length,
      duplicates: 0,
      excluded: 0,
      risky: 0,
      reasons: {} as Record<string, number>,
    };
    const emailCol = Object.entries(mapping).find(([, f]) => f === "email")?.[0];
    if (!emailCol) return emptyStats;

    const nameCol =
      Object.entries(mapping).find(([, f]) => f === "full_name")?.[0] ??
      Object.entries(mapping).find(([, f]) => f === "first_name")?.[0];

    const seen = new Set<string>();
    let valid = 0;
    let duplicates = 0;
    let invalid = 0;
    let excluded = 0;
    let risky = 0;
    const reasons: Record<string, number> = {};

    for (const r of rows) {
      const email = String(r[emailCol] ?? "").trim().toLowerCase();
      const name = nameCol ? String(r[nameCol] ?? "").trim() : undefined;
      if (!email || !EMAIL_RE.test(email)) {
        invalid++;
        continue;
      }
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);
      const verdict = classifyRecipient(email, name);
      if (verdict.quality === "invalid") {
        excluded++;
        if (verdict.reason) reasons[verdict.reason] = (reasons[verdict.reason] ?? 0) + 1;
        continue;
      }
      if (verdict.quality === "risky") risky++;
      valid++;
    }
    return { valid, invalid, duplicates, excluded, risky, reasons };
  }, [mapping, rows]);

  const sampleFor = (header: string) => {
    const samples: string[] = [];
    for (const r of rows) {
      const v = String(r[header] ?? "").trim();
      if (v) samples.push(v);
      if (samples.length === 2) break;
    }
    return samples.join(" · ");
  };

  const handleConfirm = () => {
    const seen = new Set<string>();
    const out: Array<Record<LeadField, string>> = [];
    for (const r of rows) {
      const obj: Partial<Record<LeadField, string>> = {};
      for (const [col, field] of Object.entries(mapping)) {
        if (field === "ignore") continue;
        const val = String(r[col] ?? "").trim();
        if (val) obj[field] = val;
      }
      const email = (obj.email ?? "").toLowerCase();
      if (!email || !EMAIL_RE.test(email)) continue;
      if (seen.has(email)) continue;
      seen.add(email);

      // Platshållarnamn får aldrig följa med in i mejlen ("Hej [Name of CFO]").
      obj.full_name = sanitizeName(obj.full_name);
      obj.first_name = sanitizeName(obj.first_name);
      obj.last_name = sanitizeName(obj.last_name);

      if (classifyRecipient(email, obj.full_name ?? obj.first_name).quality === "invalid") continue;

      obj.email = email;
      out.push(obj as Record<LeadField, string>);
    }
    onConfirm(out);
  };


  const usedFields = new Set(Object.values(mapping).filter((f) => f !== "ignore"));
  const hasEmail = usedFields.has("email");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {rows.length} rader i filen.{" "}
          {autoCount > 0
            ? `${autoCount} kolumner gissades automatiskt – kontrollera och ändra vid behov.`
            : "Välj vilket lead-fält varje kolumn ska mappas till."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleReguess}>
            <Wand2 className="h-3.5 w-3.5" /> Gissa om
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
            <Eraser className="h-3.5 w-3.5" /> Rensa alla
          </Button>
        </div>
      </div>

      <div className="rounded-md border divide-y">
        {headers.map((h) => (
          <div
            key={h}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{h || "(namnlös kolumn)"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {sampleFor(h) || "— tomt —"}
              </div>
            </div>
            <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              {autoMapped[h] && mapping[h] !== "ignore" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" /> Auto
                </span>
              )}
              <Select value={mapping[h]} onValueChange={(v) => handleChange(h, v as LeadField)}>
                <SelectTrigger className="h-9 w-full sm:w-[200px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_FIELDS.map((f) => (
                    <SelectItem
                      key={f.value}
                      value={f.value}
                      disabled={f.value !== "ignore" && f.value !== mapping[h] && usedFields.has(f.value)}
                    >
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-1 space-y-3 border-t bg-background/95 px-1 pt-3 pb-1 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-success/10 text-success px-2 py-1">{stats.valid} giltiga</span>
          {stats.duplicates > 0 && (
            <span className="rounded-md bg-muted text-muted-foreground px-2 py-1">{stats.duplicates} dubbletter</span>
          )}
          {stats.invalid > 0 && (
            <span className="rounded-md bg-destructive/10 text-destructive px-2 py-1">{stats.invalid} ogiltiga</span>
          )}
          {!hasEmail && (
            <span className="text-destructive text-xs">Du måste mappa en kolumn till E-post.</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Avbryt</Button>
          <Button onClick={handleConfirm} disabled={!hasEmail || stats.valid === 0 || isImporting}>
            {isImporting ? "Importerar…" : `Importera ${stats.valid} leads`}
          </Button>
        </div>
      </div>
    </div>
  );
};
