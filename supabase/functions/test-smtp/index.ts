import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function classifySmtpError(err: unknown, host: string): {
  code: string;
  message: string;
  detail: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();
  const detail = raw.slice(0, 400);
  const hostLc = host.toLowerCase();

  if ((hostLc.includes("outlook.com") || hostLc.includes("hotmail")) &&
      (m.includes("535") || m.includes("5.7.139") || m.includes("authentication"))) {
    return {
      code: "smtp_personal_outlook_blocked",
      message: "Personal Outlook/Hotmail SMTP is disabled by Microsoft.",
      detail,
    };
  }
  if (m.includes("535") || m.includes("authentication unsuccessful") ||
      m.includes("authentication failed") || m.includes("invalid login") ||
      m.includes("username and password not accepted")) {
    return { code: "smtp_auth_failed", message: "SMTP authentication failed.", detail };
  }
  if (m.includes("enotfound") || m.includes("getaddrinfo") ||
      m.includes("name or service not known")) {
    return { code: "smtp_host_not_found", message: `Host not found: ${host}`, detail };
  }
  if (m.includes("econnrefused") || m.includes("connection refused")) {
    return { code: "smtp_connection_refused", message: "Connection refused.", detail };
  }
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate") ||
      m.includes("handshake")) {
    return { code: "smtp_tls_failed", message: "TLS handshake failed.", detail };
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return { code: "smtp_timeout", message: "SMTP server did not respond in time.", detail };
  }
  return { code: "smtp_generic", message: "SMTP test failed.", detail };
}

function jsonError(
  status: number,
  payload: { code: string; message: string; detail?: string },
) {
  return new Response(JSON.stringify({ error: payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port: Number(smtp_port),
        tls: smtp_secure !== false,
        auth: { username: smtp_username, password: smtp_password },
      },
    });

    try {
      await client.send({
        from: from_email || smtp_username,
        to: from_email || smtp_username,
        subject: "MailLead.ai – SMTP test",
        content: "This is an automated test from MailLead.ai. Connection OK.",
      });
    } finally {
      try { await client.close(); } catch { /* ignore */ }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("test-smtp error", err);
    return jsonError(400, classifySmtpError(err, smtpHost));
  }
});
