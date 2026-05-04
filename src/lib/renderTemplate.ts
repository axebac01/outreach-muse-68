export type LeadVars = {
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  phone?: string | null;
  company?: string | null;
};

export type SenderVars = {
  sender_name?: string | null;
  sender_email?: string | null;
  sender_signature?: string | null;
};

export type SystemVars = {
  unsubscribe_url?: string | null;
};

export type RenderVars = LeadVars & SenderVars & SystemVars;

export type VariableGroup = "lead" | "sender" | "system";

export interface VariableDef {
  key: string;
  group: VariableGroup;
  label: string;
}

export const VARIABLE_DEFS: VariableDef[] = [
  { key: "first_name", group: "lead", label: "First name" },
  { key: "last_name", group: "lead", label: "Last name" },
  { key: "full_name", group: "lead", label: "Full name" },
  { key: "company", group: "lead", label: "Company" },
  { key: "role", group: "lead", label: "Role" },
  { key: "email", group: "lead", label: "Email" },
  { key: "phone", group: "lead", label: "Phone" },
  { key: "sender_name", group: "sender", label: "Sender name" },
  { key: "sender_email", group: "sender", label: "Sender email" },
  { key: "sender_signature", group: "sender", label: "Signature" },
  { key: "unsubscribe", group: "system", label: "Unsubscribe link" },
];

// Backwards compat: old code imports AVAILABLE_VARIABLES as string[]
export const AVAILABLE_VARIABLES = VARIABLE_DEFS.map((v) => v.key);

const fbFirst = (v: RenderVars) =>
  v.first_name || (v.full_name ? v.full_name.split(" ")[0] ?? "" : "");
const fbLast = (v: RenderVars) => {
  if (v.last_name) return v.last_name;
  if (v.full_name) {
    const parts = v.full_name.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  return "";
};

export const renderTemplate = (template: string, vars: RenderVars): string => {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_m, key: string) => {
    const k = key.toLowerCase();
    switch (k) {
      case "first_name": return fbFirst(vars);
      case "last_name": return fbLast(vars);
      case "full_name":
        return vars.full_name ?? `${fbFirst(vars)} ${fbLast(vars)}`.trim();
      case "company": return vars.company ?? "";
      case "role": return vars.role ?? "";
      case "email": return vars.email ?? "";
      case "phone": return vars.phone ?? "";
      case "sender_name": return vars.sender_name ?? "";
      case "sender_email": return vars.sender_email ?? "";
      case "sender_signature": return vars.sender_signature ?? "";
      case "unsubscribe":
        return vars.unsubscribe_url
          ? `<a href="${vars.unsubscribe_url}">Unsubscribe</a>`
          : "";
      default: return "";
    }
  });
};

export const hasUnsubscribeToken = (template: string): boolean =>
  /\{\{\s*unsubscribe\s*\}\}/i.test(template || "");
