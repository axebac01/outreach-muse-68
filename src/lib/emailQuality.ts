// Lightweight client-side heuristics for cold-email quality.
// Not a replacement for real spam tools — just nudges the writer toward better emails.

export interface QualityResult {
  wordCount: number;
  readingTimeSec: number;
  spamScore: number; // 0–10, lower is better
  spamHits: string[];
  warnings: string[];
  isPersonalized: boolean;
}

// Common spam-trigger words / phrases. Lowercased substring match.
const SPAM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(free|gratis)\b/i, label: "free/gratis" },
  { pattern: /\b(guaranteed|garanterat)\b/i, label: "guaranteed" },
  { pattern: /\b(act now|skynda|begränsat erbjudande|limited time)\b/i, label: "urgency" },
  { pattern: /\b(click here|klicka här)\b/i, label: "click here" },
  { pattern: /\b(buy now|köp nu|order now)\b/i, label: "buy now" },
  { pattern: /\b(cash|pengar tillbaka|money back)\b/i, label: "cash/money" },
  { pattern: /\b(winner|vinnare|congratulations|grattis)\b/i, label: "winner" },
  { pattern: /\b(100%|risk[- ]?free|riskfri)\b/i, label: "100%/risk-free" },
  { pattern: /!!+/, label: "multiple !!" },
  { pattern: /\$\$+|kr{2,}/i, label: "$$ symbols" },
  { pattern: /[A-ZÅÄÖ]{6,}/, label: "ALL CAPS word" },
];

const PERSONALIZATION_TOKENS = /\{\{\s*(first_name|full_name|company|role)\s*\}\}/i;

const stripHtml = (s: string) =>
  (s ?? "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "");

export const analyzeEmail = (subject: string, body: string): QualityResult => {
  const plainBody = stripHtml(body);
  const text = `${subject ?? ""}\n${plainBody}`;
  const cleanWords = plainBody
    .replace(/\{\{[^}]+\}\}/g, "x")
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = cleanWords.length;
  const readingTimeSec = Math.max(5, Math.round((wordCount / 220) * 60));

  const hits: string[] = [];
  for (const { pattern, label } of SPAM_PATTERNS) {
    if (pattern.test(text)) hits.push(label);
  }
  // Also penalize excessive links
  const linkCount = (text.match(/https?:\/\//gi) ?? []).length;
  if (linkCount >= 3) hits.push(`${linkCount} links`);

  const spamScore = Math.min(10, hits.length * 1.5 + (linkCount >= 3 ? 1 : 0));

  const warnings: string[] = [];
  if (wordCount > 180) warnings.push("Långt mejl – kortare presterar oftast bättre");
  if (wordCount < 20 && body.trim()) warnings.push("Väldigt kort – kanske för tunt?");
  if (subject && subject.length > 60) warnings.push("Lång ämnesrad – håll under 60 tecken");

  const isPersonalized = PERSONALIZATION_TOKENS.test(body ?? "");

  return { wordCount, readingTimeSec, spamScore, spamHits: hits, warnings, isPersonalized };
};

export const spamLevel = (score: number): "good" | "warn" | "bad" => {
  if (score <= 1.5) return "good";
  if (score <= 4.5) return "warn";
  return "bad";
};
