import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ImapClient } from "../_shared/imapClient.ts";
import { assertPublicHost } from "../_shared/netGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region",
};

function jsonError(
  status: number,
  payload: { code: string; message: string; detail?: string },
) {
  return new Response(JSON.stringify({ error: payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function classifyImapError(err: unknown, host: string): {
  code: string;
  message: string;
  detail: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();
  const detail = raw.slice(0, 400);

  if (m.includes("login failed") || m.includes("authenticationfailed") ||
      m.includes("invalid credentials") || m.includes("auth")) {
    return { code: "imap_auth_failed", message: "IMAP authentication failed.", detail };
  }
  if (m.includes("enotfound") || m.includes("dns") || m.includes("name or service not known") ||
      m.includes("failed to lookup")) {
    return { code: "imap_host_not_found", message: `Host not found: ${host}`, detail };
  }
  if (m.includes("connection refused") || m.includes("econnrefused")) {
    return { code: "imap_connection_refused", message: "Connection refused.", detail };
  }
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate") ||
      m.includes("handshake")) {
    return { code: "imap_tls_failed", message: "TLS handshake failed.", detail };
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return { code: "imap_timeout", message: "IMAP server did not respond in time.", detail };
  }
  return { code: "imap_generic", message: "IMAP test failed.", detail };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let imapHost = "";
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
    const { imap_host, imap_port, imap_secure, imap_username, imap_password } = body ?? {};
    imapHost = String(imap_host ?? "");

    if (!imap_host || !imap_port || !imap_username || !imap_password) {
      return jsonError(400, {
        code: "imap_missing_fields",
        message: "Missing IMAP credentials",
      });
    }

    if (imap_secure === false) {
      return jsonError(400, {
        code: "imap_tls_required",
        message: "IMAP requires TLS (port 993).",
      });
    }

    const ssrf = await assertPublicHost(imapHost);
    if (!ssrf.ok) {
      return jsonError(400, {
        code: "imap_host_not_allowed",
        message: "IMAP host is not a publicly routable address.",
        detail: ssrf.reason,
      });
    }

    const client = new ImapClient({
      host: imapHost,
      port: Number(imap_port),
      secure: true,
      username: String(imap_username),
      password: String(imap_password),
    });

    try {
      await client.connect(15000);
      await client.login(15000);
      await client.selectInbox(15000);
    } finally {
      try { await client.logout(); } catch { /* ignore */ }

    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("test-imap error", err);
    return jsonError(400, classifyImapError(err, imapHost));
  }
});
