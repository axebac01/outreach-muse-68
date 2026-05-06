// Public endpoint — receives visit beacons from the JS snippet.
// No JWT required. Auth via site_key lookup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BOT_UA_RE = /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headless|phantom|puppeteer|playwright|axios|curl|wget|python-requests|node-fetch/i;

// Anonymize IPv4 last octet, IPv6 last 80 bits
function anonymizeIp(ip: string): string {
  if (!ip) return "";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return ip;
}

interface IpLookupResult {
  domain?: string;
  name?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
  isHosting?: boolean;
}

// IPinfo lookup. Returns null if no token configured (graceful degradation)
async function ipLookup(ip: string): Promise<IpLookupResult | null> {
  const token = Deno.env.get("IPINFO_TOKEN");
  if (!token || !ip) return null;
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json?token=${token}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // IPinfo company/asn fields are on paid tiers; fall back to org parsing
    const company = data.company || {};
    const asn = data.asn || {};
    let domain = company.domain || undefined;
    let name = company.name || undefined;
    if (!name && data.org) {
      // org format: "AS#### Company Name"
      name = data.org.replace(/^AS\d+\s+/, "");
    }
    const isHosting =
      (company.type && /hosting|isp/i.test(company.type)) ||
      (asn.type && /hosting|isp/i.test(asn.type));
    return {
      domain,
      name,
      industry: company.type,
      country: data.country,
      city: data.city,
      isHosting,
    };
  } catch (_err) {
    return null;
  }
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

function extractDomain(email?: string, website?: string): string | null {
  if (website) {
    try {
      const u = new URL(website.startsWith("http") ? website : `https://${website}`);
      return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch (_e) { /* ignore */ }
  }
  if (email && email.includes("@")) {
    return email.split("@")[1].toLowerCase();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const {
      type,
      site_key,
      visitor_id: visitorIdInput,
      client_seed,
      session_id,
      visit_id,
      duration_ms,
      scroll_depth,
      url,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      email,
      consent,
    } = body || {};
    let visitor_id: string = visitorIdInput || "";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === UPDATE MODE: heartbeat / final beacon for an existing visit ===
    if (type === "update" && visit_id) {
      const patch: Record<string, unknown> = {};
      if (typeof duration_ms === "number") patch.duration_ms = Math.max(0, Math.floor(duration_ms));
      if (typeof scroll_depth === "number") patch.scroll_depth = Math.max(0, Math.min(100, Math.floor(scroll_depth)));
      if (body.ended) patch.ended_at = new Date().toISOString();
      if (Object.keys(patch).length > 0) {
        await admin.from("visits").update(patch).eq("id", visit_id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PAGEVIEW MODE ===
    if (!site_key || (!visitor_id && !client_seed) || !url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ua = req.headers.get("user-agent") || "";
    if (BOT_UA_RE.test(ua)) {
      return new Response(JSON.stringify({ ok: true, skipped: "bot" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up tracking site
    const { data: site } = await admin
      .from("tracking_sites")
      .select("id, user_id, is_active, verified_at, require_consent")
      .eq("site_key", site_key)
      .maybeSingle();

    if (!site || !site.is_active) {
      return new Response(JSON.stringify({ error: "Invalid site_key" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If site requires consent, refuse pageviews without consent flag
    if ((site as any).require_consent && consent !== true) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_consent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = site.user_id;
    const ip = getClientIp(req);
    const anonIp = anonymizeIp(ip);

    // Derive cookieless visitor_id from client_seed + anonIp + UA + day
    if (!visitor_id && client_seed) {
      const day = new Date().toISOString().slice(0, 10);
      const material = `${site_key}|${client_seed}|${anonIp}|${ua}|${day}`;
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
      visitor_id = Array.from(new Uint8Array(buf)).slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    // Update verification ping fields (fire-and-forget)
    admin
      .from("tracking_sites")
      .update({
        last_ping_at: new Date().toISOString(),
        verified_at: (site as any).verified_at || new Date().toISOString(),
        last_ping_url: url,
      })
      .eq("id", site.id)
      .then(() => {});

    // IP -> company lookup (use real IP for lookup, store only anonymized)
    const lookup = await ipLookup(ip);

    let companyId: string | null = null;
    let domain: string | null = lookup?.domain || null;

    // Skip hosting/ISP results — too noisy
    if (lookup && !lookup.isHosting && domain) {
      // Upsert inbound company
      const { data: existing } = await admin
        .from("inbound_companies")
        .select("id, visit_count, is_known_lead, matched_lead_id")
        .eq("user_id", userId)
        .eq("domain", domain)
        .maybeSingle();

      if (existing) {
        companyId = existing.id;
        await admin
          .from("inbound_companies")
          .update({
            last_seen_at: new Date().toISOString(),
            visit_count: (existing.visit_count || 0) + 1,
          })
          .eq("id", existing.id);
      } else {
        // Try to match against existing leads by domain
        const { data: matchingLead } = await admin
          .from("leads")
          .select("id")
          .eq("user_id", userId)
          .or(`email.ilike.%@${domain},website.ilike.%${domain}%`)
          .limit(1)
          .maybeSingle();

        const { data: created } = await admin
          .from("inbound_companies")
          .insert({
            user_id: userId,
            domain,
            name: lookup.name,
            industry: lookup.industry,
            country: lookup.country,
            city: lookup.city,
            visit_count: 1,
            is_known_lead: !!matchingLead,
            matched_lead_id: matchingLead?.id || null,
          })
          .select("id")
          .single();

        companyId = created?.id || null;

        if (matchingLead && companyId) {
          await admin.from("inbound_notifications").insert({
            user_id: userId,
            company_id: companyId,
            lead_id: matchingLead.id,
            message: `${lookup.name || domain} (känd lead) besökte din sajt`,
          });
        }
      }
    }

    // Identify visitor by email if provided
    let leadId: string | null = null;
    if (email) {
      const { data: lead } = await admin
        .from("leads")
        .select("id")
        .eq("user_id", userId)
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      leadId = lead?.id || null;
    }

    // Upsert visitor
    const { data: existingVisitor } = await admin
      .from("visitors")
      .select("id, visit_count")
      .eq("site_id", site.id)
      .eq("visitor_id", visitor_id)
      .maybeSingle();

    if (existingVisitor) {
      await admin
        .from("visitors")
        .update({
          last_seen_at: new Date().toISOString(),
          visit_count: (existingVisitor.visit_count || 0) + 1,
          ...(companyId ? { company_id: companyId } : {}),
          ...(email ? { email } : {}),
          ...(leadId ? { lead_id: leadId } : {}),
        })
        .eq("id", existingVisitor.id);
    } else {
      await admin.from("visitors").insert({
        user_id: userId,
        site_id: site.id,
        visitor_id,
        company_id: companyId,
        email: email || null,
        lead_id: leadId,
        visit_count: 1,
      });
    }

    // Parse path from URL
    let path: string | null = null;
    try {
      path = new URL(url).pathname;
    } catch (_e) { /* ignore */ }

    // Resolve session_id: use client-provided, else derive from last visit (<30min)
    let resolvedSession: string = session_id || "";
    if (!resolvedSession) {
      const { data: lastVisit } = await admin
        .from("visits")
        .select("session_id, created_at")
        .eq("visitor_id", visitor_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastVisit?.session_id && lastVisit.created_at) {
        const ageMs = Date.now() - new Date(lastVisit.created_at).getTime();
        if (ageMs < 30 * 60 * 1000) resolvedSession = lastVisit.session_id;
      }
      if (!resolvedSession) resolvedSession = crypto.randomUUID();
    }

    const { data: insertedVisit } = await admin.from("visits").insert({
      user_id: userId,
      site_id: site.id,
      visitor_id,
      session_id: resolvedSession,
      company_id: companyId,
      url,
      path,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      country: lookup?.country || null,
      city: lookup?.city || null,
      user_agent: ua.slice(0, 500),
    }).select("id").single();

    return new Response(JSON.stringify({ ok: true, visit_id: insertedVisit?.id, visitor_id, session_id: resolvedSession }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-visit error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
