// Company / legal contact info.
// UPDATE THESE before going live — they appear in Privacy Policy, ToS,
// Cookie Policy, Subprocessor list and the public DSR form.
export const LEGAL = {
  companyName: "MailLead AB",
  orgNumber: "—", // TODO: lägg in organisationsnummer
  address: "Stockholm, Sverige", // TODO: lägg in besöksadress
  productName: "MailLead",
  contactEmail: "support@maillead.io",
  privacyEmail: "privacy@maillead.io",
  dpoEmail: "dpo@maillead.io",
  website: "https://maillead.io",
  lastUpdated: "2026-05-18",
} as const;

export const SUBPROCESSORS = [
  { name: "Supabase (Lovable Cloud)", purpose: "Databas, autentisering, fil­lagring", location: "EU" },
  { name: "Lovable AB", purpose: "Hosting och AI Gateway", location: "EU" },
  { name: "Google LLC (Gmail API, Gemini via Lovable AI)", purpose: "E-postsändning via OAuth; AI-textgenerering", location: "EU/US (Standard Contractual Clauses)" },
  { name: "Microsoft Corporation (Graph API)", purpose: "E-postsändning via OAuth för Outlook-konton", location: "EU/US (SCC)" },
  { name: "OpenAI (via Lovable AI Gateway)", purpose: "AI-textgenerering", location: "US (SCC)" },
  { name: "IPinfo", purpose: "Geo-lookup för besöksspårning", location: "US (SCC)" },
] as const;
