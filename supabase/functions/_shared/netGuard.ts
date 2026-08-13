// Delad SSRF-guard: säkerställ att en värd är publikt routbar.

export function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const lc = ip.toLowerCase();
  if (lc === "::1" || lc === "::") return true;
  if (lc.startsWith("fc") || lc.startsWith("fd") || lc.startsWith("fe80")) return true;
  if (lc.startsWith("::ffff:")) return isPrivateIPv4(lc.slice(7));
  return false;
}

export async function assertPublicHost(
  host: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const h = String(host).trim().toLowerCase();
  if (!h) return { ok: false, reason: "empty host" };
  if (
    h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") ||
    h.endsWith(".local")
  ) {
    return { ok: false, reason: "reserved hostname" };
  }
  if (/^[\d.]+$/.test(h) && isPrivateIPv4(h)) return { ok: false, reason: "private IPv4" };
  if (h.includes(":") && isPrivateIPv6(h)) return { ok: false, reason: "private IPv6" };

  try {
    const [a, aaaa] = await Promise.allSettled([
      Deno.resolveDns(h, "A"),
      Deno.resolveDns(h, "AAAA"),
    ]);
    const ips: string[] = [];
    if (a.status === "fulfilled") ips.push(...a.value);
    if (aaaa.status === "fulfilled") ips.push(...aaaa.value);
    if (ips.length === 0) return { ok: false, reason: "host did not resolve" };
    for (const ip of ips) {
      if (ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) {
        return { ok: false, reason: "resolves to private address" };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "dns resolution failed" };
  }
}
