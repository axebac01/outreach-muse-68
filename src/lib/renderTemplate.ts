export type LeadVars = {
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  phone?: string | null;
  company?: string | null;
};

export const AVAILABLE_VARIABLES = [
  "first_name",
  "last_name",
  "full_name",
  "company",
  "role",
  "email",
  "phone",
] as const;

export type VariableKey = (typeof AVAILABLE_VARIABLES)[number];

const fallbackFirstName = (lead: LeadVars): string => {
  if (lead.first_name) return lead.first_name;
  if (lead.full_name) return lead.full_name.split(" ")[0] ?? "";
  return "";
};

const fallbackLastName = (lead: LeadVars): string => {
  if (lead.last_name) return lead.last_name;
  if (lead.full_name) {
    const parts = lead.full_name.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  return "";
};

export const renderTemplate = (template: string, lead: LeadVars): string => {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_match, key: string) => {
    const k = key.toLowerCase() as VariableKey;
    switch (k) {
      case "first_name":
        return fallbackFirstName(lead);
      case "last_name":
        return fallbackLastName(lead);
      case "full_name":
        return lead.full_name ?? `${fallbackFirstName(lead)} ${fallbackLastName(lead)}`.trim();
      case "company":
        return lead.company ?? "";
      case "role":
        return lead.role ?? "";
      case "email":
        return lead.email ?? "";
      case "phone":
        return lead.phone ?? "";
      default:
        return "";
    }
  });
};
