/**
 * Kvalitetsbedömning av mottagaradresser.
 *
 * Syfte: stoppa platshållar- och gissade adresser (`cfo@example.com`,
 * `jane.smith@foretag.se`, namn som "[Name of CFO]") innan de importeras och
 * bränner avsändardomänens rykte. Rollbaserade adresser (info@, ceo@) tillåts
 * men flaggas som risk.
 */

export type RecipientQuality = "ok" | "risky" | "invalid";

export interface RecipientVerdict {
  quality: RecipientQuality;
  reason?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domäner som aldrig är riktiga mottagare */
const FAKE_DOMAINS = [
  "example.com",
  "example.org",
  "example.net",
  "example.se",
  "exempel.se",
  "domain.com",
  "yourdomain.com",
  "company.com",
  "foretag.se",
  "test.com",
  "test.se",
  "email.com",
  "mail.com",
  "none.com",
  "no.com",
  "localhost",
];

/** Lokaldelar som är uppenbara platshållare */
const FAKE_LOCAL_PARTS = [
  "john.doe",
  "johndoe",
  "jane.doe",
  "janedoe",
  "john.smith",
  "johnsmith",
  "jane.smith",
  "janesmith",
  "firstname.lastname",
  "fornamn.efternamn",
  "förnamn.efternamn",
  "fornamn",
  "förnamn",
  "efternamn",
  "example",
  "exempel",
  "test",
  "testing",
  "noreply",
  "no-reply",
  "donotreply",
  "namn",
  "name",
  "yourname",
  "email",
  "epost",
  "n.a",
  "na",
  "unknown",
  "notfound",
  "okand",
  "okänd",
];

/** Rollbaserade prefix — levereras ofta men svarar sällan och filtreras hårdare */
const ROLE_PREFIXES = [
  "info",
  "kontakt",
  "contact",
  "hello",
  "hej",
  "support",
  "sales",
  "forsaljning",
  "order",
  "faktura",
  "invoice",
  "billing",
  "admin",
  "office",
  "kansli",
  "reception",
  "ekonomi",
  "hr",
  "jobb",
  "career",
  "press",
  "marketing",
  "webmaster",
  "postmaster",
  "ceo",
  "cfo",
  "cto",
  "vd",
];

/** Platshållare i namnfält, t.ex. "[Name of CFO]" eller "CFO Name Here" */
const FAKE_NAME_PATTERNS: RegExp[] = [
  /[[\]{}<>]/,
  /\b(name|namn)\s+(here|surname|of|efternamn)\b/i,
  /\b(first|last|full)\s*name\b/i,
  /^(name|namn|surname|efternamn|fornamn)$/i,
  /\b(ceo|cfo|cto|vd)\s+name\b/i,
  /\bname\s+(of|för|for)\b/i,
  /\bjohn\s+doe\b|\bjane\s+doe\b|\bjane\s+smith\b|\bjohn\s+smith\b/i,
  /\bname\s+surname\b/i,
  /\bokänd\b|\bunknown\b|\bn\/a\b/i,
];

export const isPlaceholderName = (name?: string | null): boolean => {
  const v = (name ?? "").trim();
  if (!v) return false;
  return FAKE_NAME_PATTERNS.some((re) => re.test(v));
};

/** Rensar bort platshållarnamn så mejlen inte börjar med "Hej [Name of CFO]" */
export const sanitizeName = (name?: string | null): string | undefined => {
  const v = (name ?? "").trim();
  if (!v || isPlaceholderName(v)) return undefined;
  return v;
};

export const classifyRecipient = (
  email: string,
  name?: string | null,
): RecipientVerdict => {
  const value = (email ?? "").trim().toLowerCase();

  if (!value || !EMAIL_RE.test(value)) {
    return { quality: "invalid", reason: "Ogiltigt format" };
  }

  const [local, domain] = value.split("@");

  if (FAKE_DOMAINS.includes(domain)) {
    return { quality: "invalid", reason: "Exempeldomän" };
  }
  if (domain.endsWith(".example") || domain.endsWith(".invalid") || domain.endsWith(".test")) {
    return { quality: "invalid", reason: "Exempeldomän" };
  }

  const localBase = local.replace(/\+.*$/, "");
  if (FAKE_LOCAL_PARTS.includes(localBase)) {
    return { quality: "invalid", reason: "Platshållaradress" };
  }
  if (/^(john|jane)[._-]?(doe|smith)\d*$/.test(localBase)) {
    return { quality: "invalid", reason: "Platshållaradress" };
  }
  if (/^(test|exempel|example|dummy|sample)[._-]?\d*$/.test(localBase)) {
    return { quality: "invalid", reason: "Platshållaradress" };
  }

  if (isPlaceholderName(name)) {
    return { quality: "invalid", reason: "Platshållarnamn" };
  }

  if (ROLE_PREFIXES.includes(localBase)) {
    return { quality: "risky", reason: "Rollbaserad adress" };
  }

  return { quality: "ok" };
};

export interface QualitySummary {
  total: number;
  ok: number;
  risky: number;
  invalid: number;
  /** Andel riskadresser (invalid + risky) av totalen, 0–1 */
  riskRatio: number;
  /** Andel ogiltiga av totalen, 0–1 */
  invalidRatio: number;
  reasons: Record<string, number>;
}

export const summarizeRecipients = (
  items: Array<{ email: string; name?: string | null }>,
): QualitySummary => {
  const summary: QualitySummary = {
    total: items.length,
    ok: 0,
    risky: 0,
    invalid: 0,
    riskRatio: 0,
    invalidRatio: 0,
    reasons: {},
  };

  for (const item of items) {
    const verdict = classifyRecipient(item.email, item.name);
    summary[verdict.quality]++;
    if (verdict.reason) {
      summary.reasons[verdict.reason] = (summary.reasons[verdict.reason] ?? 0) + 1;
    }
  }

  if (summary.total > 0) {
    summary.invalidRatio = summary.invalid / summary.total;
    summary.riskRatio = (summary.invalid + summary.risky) / summary.total;
  }

  return summary;
};
