import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runDeliverabilityCheck } from "../_shared/deliverability.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}
function isPrivateIPv6(ip: string): boolean {
  const lc = ip.toLowerCase();
  if (lc === "::1" || lc === "::") return true;
  if (lc.startsWith("fc") || lc.startsWith("fd") || lc.startsWith("fe80")) return true;
  if (lc.startsWith("::ffff:")) return isPrivateIPv4(lc.slice(7));
  return false;
}
async function assertPublicHost(host: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const h = host.trim().toLowerCase();
  if (!h) return { ok: false, reason: "empty host" };
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) {
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

// Encrypts a string with EMAIL_TOKEN_ENCRYPTION_KEY using pgp_sym_encrypt
// and returns a Postgres `\x...` hex string suitable for direct insertion
// into a bytea column via supabase-js. Returning a Uint8Array would be
// JSON.stringify'd by PostgREST and silently corrupt the bytea.
async function encryptIfPossible(
  supabaseAdmin: ReturnType<typeof createClient>,
  plaintext: string,
): Promise<string> {
  const bytesToHex = (bytes: Uint8Array) => {
    let hex = "\\x";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return hex;
  };
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) {
    // Dev fallback — store plaintext bytes as bytea hex.
    return bytesToHex(new TextEncoder().encode(plaintext));
  }
  const { data, error } = await supabaseAdmin.rpc("encrypt_secret", {
    plaintext,
    key,
  });
  if (error) {
    console.warn("encrypt_secret RPC failed — storing plaintext bytes", error);
    return bytesToHex(new TextEncoder().encode(plaintext));
  }
  if (typeof data === "string") {
    return data.startsWith("\\x") ? data : bytesToHex(new TextEncoder().encode(data));
  }
  if (data instanceof Uint8Array) return bytesToHex(data);
  return bytesToHex(new TextEncoder().encode(String(data)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      email,
      display_name,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
      imap_host,
      imap_port,
      imap_secure,
      imap_username,
      imap_password,
    } = body ?? {};

    if (
      !email || !smtp_host || !smtp_port || !smtp_username || !smtp_password
    ) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF guard: reject private/loopback/link-local/CGNAT/multicast targets.
    const ssrf = await assertPublicHost(String(smtp_host));
    if (!ssrf.ok) {
      return new Response(
        JSON.stringify({ error: `SMTP host not allowed: ${ssrf.reason}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (imap_host) {
      const ssrfImap = await assertPublicHost(String(imap_host));
      if (!ssrfImap.ok) {
        return new Response(
          JSON.stringify({ error: `IMAP host not allowed: ${ssrfImap.reason}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const smtp_password_enc = await encryptIfPossible(admin, smtp_password);
    const imap_password_enc = imap_password
      ? await encryptIfPossible(admin, imap_password)
      : null;

    const { data: inserted, error: insertErr } = await admin
      .from("email_accounts")
      .insert({
        user_id: userId,
        email,
        display_name: display_name ?? null,
        provider: "smtp",
        auth_type: "smtp",
        status: "active",
        smtp_host,
        smtp_port: Number(smtp_port),
        smtp_secure: smtp_secure !== false,
        smtp_username,
        smtp_password_enc,
        imap_host: imap_host ?? null,
        imap_port: imap_port ? Number(imap_port) : null,
        imap_secure: imap_secure !== false,
        imap_username: imap_username ?? null,
        imap_password_enc,
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: inserted.id, ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("connect-smtp-account error", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to connect account" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
