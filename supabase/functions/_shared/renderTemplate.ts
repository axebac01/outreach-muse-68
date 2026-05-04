// Deno-compatible copy of src/lib/renderTemplate.ts (template render only)
export type RenderVars = {
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  phone?: string | null;
  company?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  sender_signature?: string | null;
  unsubscribe_url?: string | null;
};

const fbFirst = (v: RenderVars) =>
  v.first_name || (v.full_name ? v.full_name.split(" ")[0] ?? "" : "");
const fbLast = (v: RenderVars) => {
  if (v.last_name) return v.last_name;
  if (v.full_name) {
    const p = v.full_name.split(" ");
    return p.length > 1 ? p.slice(1).join(" ") : "";
  }
  return "";
};

export function renderTemplate(template: string, vars: RenderVars): string {
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
}

export const hasUnsubscribeToken = (s: string) =>
  /\{\{\s*unsubscribe\s*\}\}/i.test(s || "");
