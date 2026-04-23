import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type LeadField =
  | "email"
  | "full_name"
  | "first_name"
  | "last_name"
  | "role"
  | "phone"
  | "company"
  | "ignore";

export const LEAD_FIELDS: { value: LeadField; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "full_name", label: "Full name" },
  { value: "first_name", label: "First name" },
  { value: "last_name", label: "Last name" },
  { value: "role", label: "Role" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "ignore", label: "— ignore —" },
];

const HEADER_GUESS: Record<string, LeadField> = {
  email: "email",
  "email address": "email",
  "e-mail": "email",
  mail: "email",
  name: "full_name",
  "full name": "full_name",
  fullname: "full_name",
  "first name": "first_name",
  firstname: "first_name",
  fname: "first_name",
  "last name": "last_name",
  lastname: "last_name",
  lname: "last_name",
  surname: "last_name",
  role: "role",
  title: "role",
  "job title": "role",
  position: "role",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  company: "company",
  organization: "company",
  org: "company",
  employer: "company",
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
    headers.forEach((h) => {
      const guess = HEADER_GUESS[h.trim().toLowerCase()];
      m[h] = guess ?? "ignore";
    });
    return m;
  }, [headers]);

  const [mapping, setMapping] = useState<Record<string, LeadField>>(initial);

  const previewRows = rows.slice(0, 5);

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

  const hasEmail = Object.values(mapping).includes("email");

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h} className="min-w-[160px] align-top">
                  <div className="space-y-2 py-2">
                    <div className="text-xs text-muted-foreground truncate">{h}</div>
                    <Select
                      value={mapping[h]}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v as LeadField }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((r, i) => (
              <TableRow key={i}>
                {headers.map((h) => (
                  <TableCell key={h} className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {String(r[h] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-success/10 text-success px-2 py-1">{stats.valid} valid</span>
        {stats.duplicates > 0 && (
          <span className="rounded-md bg-muted text-muted-foreground px-2 py-1">{stats.duplicates} duplicates</span>
        )}
        {stats.invalid > 0 && (
          <span className="rounded-md bg-destructive/10 text-destructive px-2 py-1">{stats.invalid} invalid</span>
        )}
        {!hasEmail && (
          <span className="text-destructive text-xs">You must map a column to Email.</span>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!hasEmail || stats.valid === 0 || isImporting}>
          {isImporting ? "Importing…" : `Import ${stats.valid} leads`}
        </Button>
      </div>
    </div>
  );
};
