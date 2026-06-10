// Shared SPF/DKIM/DMARC-checker via Google DNS-over-HTTPS.
// Används både av check-deliverability (manuell knapp) och vid kontokoppling
// (oauth-callback, connect-smtp-account) för att lagra resultat på email_accounts.

type DnsAnswer = { name: string; type: number; TTL: number; data: string };

async function dohQuery(name: string, type: "TXT" | "CNAME" | "MX"): Promise<DnsAnswer[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const res = await fetch(url, { headers: { accept: "application/dns-json" } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.Answer ?? []) as DnsAnswer[];
  } catch {
    return [];
  }
}

function stripQuotes(s: string): string {
  return s.replace(/^"|"$/g, "").replace(/"\s*"/g, "");
}

export async function checkSpf(domain: string) {
  const ans = await dohQuery(domain, "TXT");
  const spf = ans.map((a) => stripQuotes(a.data)).find((d) => d.toLowerCase().startsWith("v=spf1"));
  if (!spf) return { status: "missing" as const, record: null, message: "No SPF record found" };
  const policy = /-all\b/.test(spf) ? "strict" : /~all\b/.test(spf) ? "softfail" : "neutral";
  return { status: "ok" as const, record: spf, policy };
}

export async function checkDkim(domain: string, provider: string) {
  const selectors: Record<string, string[]> = {
    gmail: ["google"],
    outlook: ["selector1", "selector2"],
    smtp: ["default", "mail", "selector1", "google", "k1", "s1"],
  };
  const list = selectors[provider] ?? selectors.smtp;
  for (const sel of list) {
    const name = `${sel}._domainkey.${domain}`;
    const txt = await dohQuery(name, "TXT");
    const found = txt.map((a) => stripQuotes(a.data)).find((d) => /v=DKIM1/i.test(d) || /p=/i.test(d));
    if (found) return { status: "ok" as const, selector: sel, record: found.slice(0, 200) };
    const cname = await dohQuery(name, "CNAME");
    if (cname.length > 0) return { status: "ok" as const, selector: sel, record: cname[0].data };
  }
  return { status: "missing" as const, message: `No DKIM record for common selectors (${list.join(", ")})` };
}

export async function checkDmarc(domain: string) {
  const ans = await dohQuery(`_dmarc.${domain}`, "TXT");
  const dmarc = ans.map((a) => stripQuotes(a.data)).find((d) => /v=DMARC1/i.test(d));
  if (!dmarc) return { status: "missing" as const, record: null, message: "No DMARC record found" };
  const policyMatch = dmarc.match(/p=(none|quarantine|reject)/i);
  return { status: "ok" as const, record: dmarc, policy: policyMatch?.[1]?.toLowerCase() ?? "none" };
}

export async function runDeliverabilityCheck(email: string, provider: string) {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return null;
  }
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain, provider.toLowerCase()),
    checkDmarc(domain),
  ]);
  const passCount = [spf, dkim, dmarc].filter((r) => r.status === "ok").length;
  const score = passCount === 3 ? "good" : passCount >= 2 ? "warn" : "bad";
  return { domain, spf, dkim, dmarc, score, checked_at: new Date().toISOString() };
}
