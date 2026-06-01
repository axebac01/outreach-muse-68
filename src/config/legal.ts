// Company / legal contact info.
// Used in Privacy Policy, ToS, Cookie Policy, Subprocessor list and the public DSR form.
export const LEGAL = {
  companyName: "CRMdata i Sverige AB",
  orgNumber: "559255-7929",
  address: "Hagaesplanaden 86, 113 67 Stockholm",
  productName: "MailLead",
  contactEmail: "info@insynia.ai",
  privacyEmail: "info@insynia.ai",
  dpoEmail: "info@insynia.ai",
  website: "https://maillead.ai",
  lastUpdated: "2026-06-01",
} as const;

export const SUBPROCESSORS = [
  { name: "Supabase (Lovable Cloud)", purpose: "Databas, autentisering, fil­lagring", location: "EU" },
  { name: "Lovable AB", purpose: "Hosting och AI Gateway", location: "EU" },
  { name: "Google LLC (Gmail API, Gemini via Lovable AI)", purpose: "E-postsändning via OAuth; AI-textgenerering", location: "EU/US (Standard Contractual Clauses)" },
  { name: "Microsoft Corporation (Graph API)", purpose: "E-postsändning via OAuth för Outlook-konton", location: "EU/US (SCC)" },
  { name: "OpenAI (via Lovable AI Gateway)", purpose: "AI-textgenerering", location: "US (SCC)" },
  { name: "IPinfo", purpose: "Geo-lookup för besöksspårning", location: "US (SCC)" },
] as const;
