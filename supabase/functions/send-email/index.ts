import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  corsHeaders,
  decryptToken,
  getValidGoogleAccessToken,
} from "../_shared/oauth.ts";
import {
  signUnsubscribeToken,
  buildUnsubscribeUrl,
} from "../_shared/unsubscribe.ts";

function buildRfc2822(opts: {
  from: string;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  extraHeaders?: string[];
}): string {
  const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
  const headers: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
  ];
  if (opts.extraHeaders) headers.push(...opts.extraHeaders);
  if (opts.inReplyTo) {
    headers.push(`In-Reply-To: ${opts.inReplyTo}`);
    headers.push(`References: ${opts.inReplyTo}`);
  }

  if (opts.bodyHtml && opts.bodyText) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      headers.join("\r\n"),
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      opts.bodyText,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      opts.bodyHtml,
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }
  if (opts.bodyHtml) {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    return headers.join("\r\n") + "\r\n\r\n" + opts.bodyHtml;
  }
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  return headers.join("\r\n") + "\r\n\r\n" + (opts.bodyText ?? "");
}

function base64UrlEncode(s: string): string {
  // UTF-8 safe base64url
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendViaGmail(
  admin: ReturnType<typeof createClient>,
  account: any,
  toAddr: string,
  subject: string,
  bodyHtml: string | undefined,
  bodyText: string | undefined,
  inReplyTo: string | undefined,
): Promise<{ messageId: string | null }> {
  const accessToken = await getValidGoogleAccessToken(admin, account);
  const rfc = buildRfc2822({
    from: account.display_name
      ? `${account.display_name} <${account.email}>`
      : account.email,
    to: toAddr,
    subject,
    bodyText: bodyText ?? undefined,
    bodyHtml: bodyHtml ?? undefined,
    inReplyTo,
  });
  const raw = base64UrlEncode(rfc);
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gmail send failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return { messageId: json.id ?? null };
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

    const {
      email_account_id,
      to,
      subject,
      body_html,
      body_text,
      lead_id,
      in_reply_to,
    } = await req.json();

    if (!email_account_id || !to || !subject) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: account, error: accErr } = await admin
      .from("email_accounts")
      .select("*")
      .eq("id", email_account_id)
      .eq("user_id", userId)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = "sent";
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;

    try {
      if (account.auth_type === "oauth" && account.provider === "gmail") {
        const r = await sendViaGmail(
          admin,
          account,
          to,
          subject,
          body_html,
          body_text,
          in_reply_to,
        );
        providerMessageId = r.messageId;
      } else if (account.auth_type === "smtp") {
        const password = await decryptToken(admin, account.smtp_password_enc);
        const client = new SMTPClient({
          connection: {
            hostname: account.smtp_host,
            port: account.smtp_port,
            tls: account.smtp_secure !== false,
            auth: { username: account.smtp_username, password },
          },
        });
        try {
          const result = await client.send({
            from: account.display_name
              ? `${account.display_name} <${account.email}>`
              : account.email,
            to,
            subject,
            content: body_text || "",
            html: body_html || undefined,
            inReplyTo: in_reply_to || undefined,
          });
          providerMessageId = (result as any)?.messageId ?? null;
        } finally {
          try {
            await client.close();
          } catch (_) { /* noop */ }
        }
      } else {
        throw new Error(
          `Unsupported account type: ${account.auth_type}/${account.provider}`,
        );
      }
    } catch (sendErr: any) {
      status = "failed";
      errorMessage = sendErr?.message || "Send failed";
    }

    await admin.from("email_messages").insert({
      user_id: userId,
      email_account_id,
      lead_id: lead_id ?? null,
      direction: "outbound",
      from_address: account.email,
      to_address: to,
      subject,
      body_text: body_text ?? null,
      body_html: body_html ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      status,
      error_message: errorMessage,
      provider_message_id: providerMessageId,
      in_reply_to: in_reply_to ?? null,
    });

    if (status !== "sent") {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-email error", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
