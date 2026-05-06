// Helper for auto-tagging links in outgoing emails with a signed lead token
// so visits to the tracked site can be re-identified to a lead on click.

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export async function buildLeadToken(leadId: string, secret: string): Promise<string> {
  const idPart = b64url(new TextEncoder().encode(leadId));
  const sig = await hmacSha256(secret, leadId);
  const sigPart = b64url(sig).slice(0, 16); // 96-bit truncated, plenty against guessing
  return `${idPart}.${sigPart}`;
}

export async function verifyLeadToken(token: string, secret: string): Promise<string | null> {
  if (!token || !token.includes(".")) return null;
  const [idPart, sigPart] = token.split(".");
  try {
    const padded = idPart.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const decoded = atob(padded + pad);
    const leadId = decoded;
    const expected = await buildLeadToken(leadId, secret);
    if (expected.split(".")[1] === sigPart) return leadId;
    return null;
  } catch (_e) {
    return null;
  }
}

function normalizeDomain(d: string): string {
  return d.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
}

function hostMatches(host: string, trackedDomains: string[]): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return trackedDomains.some((d) => {
    const nd = normalizeDomain(d);
    return h === nd || h.endsWith("." + nd);
  });
}

function addParam(url: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`).test(url)) return url;
  const hashIdx = url.indexOf("#");
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}${hash}`;
}

export async function tagLinksForTracking(
  html: string | undefined,
  text: string | undefined,
  opts: { leadId: string; trackedDomains: string[]; secret: string },
): Promise<{ html?: string; text?: string }> {
  if (!opts.leadId || !opts.secret || opts.trackedDomains.length === 0) {
    return { html, text };
  }
  const token = await buildLeadToken(opts.leadId, opts.secret);

  const transformUrl = (raw: string): string => {
    try {
      const u = new URL(raw);
      if (!/^https?:$/.test(u.protocol)) return raw;
      if (!hostMatches(u.hostname, opts.trackedDomains)) return raw;
      return addParam(raw, "ml_e", token);
    } catch (_e) {
      return raw;
    }
  };

  let outHtml = html;
  if (outHtml) {
    outHtml = outHtml.replace(/(<a\b[^>]*\bhref\s*=\s*)(["'])(.*?)\2/gi, (_m, pre, q, href) => {
      return `${pre}${q}${transformUrl(href)}${q}`;
    });
  }

  let outText = text;
  if (outText) {
    outText = outText.replace(/https?:\/\/[^\s<>"')]+/g, (m) => transformUrl(m));
  }

  return { html: outHtml, text: outText };
}
