import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedLead {
  full_name: string;
  email: string;
  company: string;
  role?: string;
  website?: string;
  linkedin_url?: string;
  notes?: string;
}

const HEADER_MAP: Record<string, keyof ParsedLead> = {
  name: "full_name",
  "full name": "full_name",
  full_name: "full_name",
  fullname: "full_name",
  email: "email",
  "email address": "email",
  e_mail: "email",
  "e-mail": "email",
  company: "company",
  organization: "company",
  org: "company",
  role: "role",
  title: "role",
  "job title": "role",
  position: "role",
  website: "website",
  url: "website",
  site: "website",
  linkedin: "linkedin_url",
  linkedin_url: "linkedin_url",
  "linkedin url": "linkedin_url",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

const normalizeKey = (k: string) => k.trim().toLowerCase();

const mapRow = (row: Record<string, any>): ParsedLead | null => {
  const out: any = {};
  for (const [rawKey, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;
    const norm = normalizeKey(String(rawKey));
    const field = HEADER_MAP[norm];
    if (field) {
      const str = String(value).trim();
      if (str) out[field] = str;
    }
  }

  const email = out.email?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  if (!out.full_name) {
    out.full_name = email.split("@")[0];
  }
  if (!out.company) {
    const domain = email.split("@")[1] || "";
    out.company = domain.split(".")[0] || "Unknown";
  }

  return {
    full_name: out.full_name,
    email,
    company: out.company,
    role: out.role,
    website: out.website,
    linkedin_url: out.linkedin_url,
    notes: out.notes,
  };
};

export const parseLeadsFile = async (file: File): Promise<ParsedLead[]> => {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = (result.data as Record<string, any>[])
            .map(mapRow)
            .filter((r): r is ParsedLead => r !== null);
          resolve(rows);
        },
        error: reject,
      });
    });
  }

  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    return json.map(mapRow).filter((r): r is ParsedLead => r !== null);
  }

  throw new Error("Unsupported file type. Please upload CSV or Excel.");
};
