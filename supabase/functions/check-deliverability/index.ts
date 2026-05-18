// Checks SPF, DKIM, DMARC for a given email domain via Google DNS-over-HTTPS.
// Requires a valid Supabase JWT to avoid being abused as a public DNS proxy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/oauth.ts";

type DnsAnswer = { name: string; type: number; TTL: number; data: string };

async function dohQuery(name: string, type: "TXT" | "CNAME" | "MX"): Promise<DnsAnswer[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.Answer ?? []) as DnsAnswer[];
}

function stripQuotes(s: string): string {
  return s.replace(/^"|"$/g, "").replace(/"\s*"/g, "");
}

async function checkSpf(domain: string) {
  const ans = await dohQuery(domain, "TXT");
  const spf = ans.map((a) => stripQuotes(a.data)).find((d) => d.toLowerCase().startsWith("v=spf1"));
  if (!spf) return { status: "missing" as const, record: null, message: "No SPF record found" };
  // Soft-pass policies are weaker; hard fail (-all) preferred.
  const policy = /-all\b/.test(spf) ? "strict" : /~all\b/.test(spf) ? "softfail" : "neutral";
  return { status: "ok" as const, record: spf, policy };
}

async function checkDkim(domain: string, provider: string) {
  // Probe common selectors per provider
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
  return { status: "missing" as const, message: `No DKIM record found for common selectors (${list.join(", ")})` };
}

async function checkDmarc(domain: string) {
  const ans = await dohQuery(`_dmarc.${domain}`, "TXT");
  const dmarc = ans.map((a) => stripQuotes(a.data)).find((d) => /v=DMARC1/i.test(d));
  if (!dmarc) return { status: "missing" as const, record: null, message: "No DMARC record found" };
  const policyMatch = dmarc.match(/p=(none|quarantine|reject)/i);
  return { status: "ok" as const, record: dmarc, policy: policyMatch?.[1]?.toLowerCase() ?? "none" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // JWT gate — prevents anonymous abuse of DNS-over-HTTPS proxy.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supa.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { domain, provider } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "domain required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clean = domain.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) {
      return new Response(JSON.stringify({ error: "invalid domain" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const [spf, dkim, dmarc] = await Promise.all([
      checkSpf(clean),
      checkDkim(clean, (provider || "smtp").toLowerCase()),
      checkDmarc(clean),
    ]);
    const passCount = [spf, dkim, dmarc].filter((r) => r.status === "ok").length;
    const score = passCount === 3 ? "good" : passCount >= 2 ? "warn" : "bad";
    return new Response(JSON.stringify({ domain: clean, spf, dkim, dmarc, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
