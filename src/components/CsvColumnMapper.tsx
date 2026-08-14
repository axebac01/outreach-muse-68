import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

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

const HEADER_GUESS: Record<string, LeadField> = {
  email: "email",
  "email address": "email",
  "e-mail": "email",
  mail: "email",
  "e-post": "email",
  epost: "email",
  "e-postadress": "email",
  name: "full_name",
  namn: "full_name",
  "full name": "full_name",
  fullname: "full_name",
  "first name": "first_name",
  firstname: "first_name",
  fname: "first_name",
  förnamn: "first_name",
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
  company: "company",
  organization: "company",
  org: "company",
  employer: "company",
  företag: "company",
  foretag: "company",
  bolag: "company",
  website: "website",
  url: "website",
  site: "website",
  webbplats: "website",
  hemsida: "website",
  webb: "website",
  domain: "website",
  domän: "website",
};

export interface CsvColumnMapperProps {
  headers: string[];
  rows: Record<string, any>[];
  onConfirm: (mapped: Array<Record<LeadField, string>>) => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export const CsvColumnMapper = ({ headers, rows, onConfirm, onCancel, isImporting }: CsvColumnMapperProps) => {
  const initial: Record<string, LeadField> = useMemo(() => {
    const m: Record<string, LeadField> = {};
    const used = new Set<LeadField>();
    headers.forEach((h) => {
      const guess = HEADER_GUESS[h.trim().toLowerCase()];
      if (guess && !used.has(guess)) {
        used.add(guess);
        m[h] = guess;
      } else {
        m[h] = "ignore";
      }
    });
    return m;
  }, [headers]);

  const [mapping, setMapping] = useState<Record<string, LeadField>>(initial);

  const stats = useMemo(() => {
    const emailCol = Object.entries(mapping).find(([, f]) => f === "email")?.[0];
    if (!emailCol) return { valid: 0, invalid: rows.length, duplicates: 0 };
    const seen = new Set<string>();
    let valid = 0;
    let duplicates = 0;
    let invalid = 0;
    for (const r of rows) {
      const email = String(r[emailCol] ?? "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        invalid++;
        continue;
      }
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);
      valid++;
    }
    return { valid, invalid, duplicates };
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
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      if (seen.has(email)) continue;
      seen.add(email);
      obj.email = email;
      out.push(obj as Record<LeadField, string>);
    }
    onConfirm(out);
  };

  const usedFields = new Set(Object.values(mapping).filter((f) => f !== "ignore"));
  const hasEmail = usedFields.has("email");

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {rows.length} rader i filen. Välj vilket lead-fält varje kolumn ska mappas till.
      </p>

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
            <Select
              value={mapping[h]}
              onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v as LeadField }))}
            >
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
