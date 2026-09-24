/**
 * Enkel heuristik för att flagga inkommande mejl som ser ut som bluff
 * (delade "filer", påstådda för stora bilagor, länkar till andra domäner än
 * avsändarens). Körs helt på klienten — inga AI-anrop.
 */

export interface SuspicionResult {
  suspicious: boolean;
  reasons: string[];
}

const PHRASES: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(skickade|delade)\s+en\s+fil\b|\bshared\s+a\s+(file|document)\b|\bsent\s+you\s+a\s+file\b/i, reason: "Påstår sig ha delat en fil" },
  { re: /för\s+stora?\s+(som\s+)?bilag|too\s+large\s+to\s+attach|bilagan?\s+var\s+för\s+stor/i, reason: '"Bilagan var för stor"' },
  { re: /säker(t|a)?\s+(pdf|dokument|fil|länk)|secure\s+(pdf|document|file|link)/i, reason: 'Talar om "säkert" dokument' },
  { re: /verifiera\s+din\s+identitet|logga\s+in\s+för\s+att\s+(se|öppna)|sign\s+in\s+to\s+(view|open)/i, reason: "Ber dig logga in för att se innehållet" },
  { re: /\bdocusign\b|\bwetransfer\b|\bsharepoint\b|\bonedrive\b|\bdropbox\b|\bevernote\b/i, reason: "Hänvisar till extern fildelning" },
];

const LINK_RE = /https?:\/\/([^\s"'<>)\]]+)/gi;

const rootDomain = (host: string) => {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  return parts.slice(-2).join(".");
};

export const inspectInboundEmail = (opts: {
  from_address?: string | null;
  subject?: string | null;
  body?: string | null;
}): SuspicionResult => {
  const text = `${opts.subject ?? ""}\n${opts.body ?? ""}`;
  const reasons: string[] = [];

  for (const p of PHRASES) {
    if (p.re.test(text)) reasons.push(p.reason);
  }

  const senderDomain = rootDomain(String(opts.from_address ?? "").split("@")[1] ?? "");
  const foreign = new Set<string>();
  for (const match of text.matchAll(LINK_RE)) {
    const host = match[1].split("/")[0];
    const d = rootDomain(host);
    if (d && senderDomain && d !== senderDomain) foreign.add(d);
  }
  if (foreign.size > 0 && reasons.length > 0) {
    reasons.push(`Länkar till ${Array.from(foreign).slice(0, 3).join(", ")}`);
  }

  // Minst två signaler krävs för att undvika falsklarm på vanliga mejl.
  return { suspicious: reasons.length >= 2, reasons };
};
