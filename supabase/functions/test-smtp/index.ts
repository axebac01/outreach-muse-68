import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifySmtpLogin } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region",
};

function classifySmtpError(err: unknown, host: string): {
  code: string;
  message: string;
  detail: string;
  stage?: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();
  const detail = raw.slice(0, 400);
  const hostLc = host.toLowerCase();
  const stage = (err && typeof err === "object" && typeof (err as any).stage === "string")
    ? (err as any).stage as string
    : undefined;

  if ((hostLc.includes("outlook.com") || hostLc.includes("hotmail")) &&
      (m.includes("535") || m.includes("5.7.139") || m.includes("authentication"))) {
    return {
      code: "smtp_personal_outlook_blocked",
      message: "Personal Outlook/Hotmail SMTP is disabled by Microsoft.",
      detail,
      stage,
    };
  }
  if (m.includes("sender address blocked") || m.includes("5.1.8") ||
      m.includes("relay access denied") || m.includes("relaying denied") ||
      m.includes("sender not allowed") || m.includes("not authorized to send") ||
      m.includes("5.7.1") || m.includes("smtp 554")) {
    return {
      code: "smtp_sender_blocked",
      message: "Sender address blocked by the mail server.",
      detail,
      stage,
    };
  }
  if (m.includes("535") || m.includes("authentication unsuccessful") ||
      m.includes("authentication failed") || m.includes("invalid login") ||
      m.includes("username and password not accepted")) {
    return { code: "smtp_auth_failed", message: "SMTP authentication failed.", detail, stage };
  }
  if (m.includes("enotfound") || m.includes("getaddrinfo") ||
      m.includes("name or service not known")) {
    return { code: "smtp_host_not_found", message: `Host not found: ${host}`, detail, stage };
  }
  if (m.includes("econnrefused") || m.includes("connection refused")) {
    return { code: "smtp_connection_refused", message: "Connection refused.", detail, stage };
  }
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate") ||
      m.includes("handshake")) {
    return { code: "smtp_tls_failed", message: "TLS handshake failed.", detail, stage };
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return { code: "smtp_timeout", message: "SMTP server did not respond in time.", detail, stage };
  }
  return { code: "smtp_generic", message: "SMTP test failed.", detail, stage };
}

/**
 * Zoho har två uppsättningar SMTP-värdar: `smtppro.*` för betalda planer och
 * `smtp.*` för gratis/övriga. Fel värd ger 554 5.1.8 trots rätt lösenord, så vi
 * provar motsvarigheten automatiskt och rapporterar om den fungerar.
 */
function alternateHosts(host: string): string[] {
  const h = host.trim().toLowerCase();
  if (!h.includes("zoho")) return [];
  if (h.startsWith("smtppro.")) return [h.replace(/^smtppro\./, "smtp.")];
  if (h.startsWith("smtp.")) return [h.replace(/^smtp\./, "smtppro.")];
  return [];
}

function jsonError(
  status: number,
  payload: {
    code: string;
    message: string;
    detail?: string;
    stage?: string;
    alt_host?: string;
  },
) {
  return new Response(JSON.stringify({ error: payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}


function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lc = ip.toLowerCase();
  if (lc === "::1" || lc === "::") return true;
  if (lc.startsWith("fc") || lc.startsWith("fd")) return true; // ULA
  if (lc.startsWith("fe80")) return true; // link-local
  if (lc.startsWith("::ffff:")) {
    const v4 = lc.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
}

async function assertPublicHost(host: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const h = String(host).trim().toLowerCase();
  if (!h) return { ok: false, reason: "empty host" };
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) {
    return { ok: false, reason: "reserved hostname" };
  }
  // If already an IP literal
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


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let smtpHost = "";
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, { code: "unauthorized", message: "Unauthorized" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonError(401, { code: "unauthorized", message: "Unauthorized" });
    }

    const body = await req.json();
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
      from_email,
    } = body ?? {};
    smtpHost = String(smtp_host ?? "");

    if (!smtp_host || !smtp_port || !smtp_username || !smtp_password) {
      return jsonError(400, {
        code: "smtp_missing_fields",
        message: "Missing SMTP credentials",
      });
    }

    // Guardrail: personal Outlook/Hotmail SMTP was disabled by Microsoft in 2024.
    const hostLc = smtpHost.toLowerCase();
    const userLc = String(smtp_username).toLowerCase();
    if (
      (hostLc.includes("outlook.com") || hostLc.includes("hotmail") ||
        hostLc === "smtp-mail.outlook.com") &&
      (userLc.endsWith("@outlook.com") || userLc.endsWith("@hotmail.com") ||
        userLc.endsWith("@live.com"))
    ) {
      return jsonError(400, {
        code: "smtp_personal_outlook_blocked",
        message: "Personal Outlook/Hotmail SMTP is disabled by Microsoft.",
      });
    }

    // SSRF guard: reject private, loopback, link-local, and other reserved targets.
    const ssrfCheck = await assertPublicHost(smtp_host);
    if (!ssrfCheck.ok) {
      return jsonError(400, {
        code: "smtp_host_not_allowed",
        message: "SMTP host is not a publicly routable address.",
        detail: ssrfCheck.reason,
      });
    }

    const secure = smtp_secure !== false && ![587, 25, 2525].includes(Number(smtp_port));
    try {
      await verifySmtpLogin({
        hostname: smtp_host,
        port: Number(smtp_port),
        // 587/25 = plain connection upgraded via STARTTLS, 465 = implicit TLS
        secure,
        username: smtp_username,
        password: smtp_password,
      });
    } catch (err) {
      const classified = classifySmtpError(err, smtpHost);
      if (classified.code === "smtp_sender_blocked") {
        for (const alt of alternateHosts(smtpHost)) {
          const altOk = await assertPublicHost(alt);
          if (!altOk.ok) continue;
          try {
            await verifySmtpLogin({
              hostname: alt,
              port: Number(smtp_port),
              secure,
              username: smtp_username,
              password: smtp_password,
            });
            console.log(`test-smtp: ${smtpHost} blocked, ${alt} works`);
            return jsonError(400, { ...classified, alt_host: alt });
          } catch (_altErr) { /* alternativvärden fungerade inte heller */ }
        }
      }
      throw err;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("test-smtp error", err);
    return jsonError(400, classifySmtpError(err, smtpHost));
  }
});
