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
  fromAddr: string,
  toAddr: string,
  subject: string,
  bodyHtml: string | undefined,
  bodyText: string | undefined,
  inReplyTo: string | undefined,
  extraHeaders: string[],
): Promise<{ messageId: string | null }> {
  const accessToken = await getValidGoogleAccessToken(admin, account);
  const rfc = buildRfc2822({
    from: fromAddr,
    to: toAddr,
    subject,
    bodyText: bodyText ?? undefined,
    bodyHtml: bodyHtml ?? undefined,
    inReplyTo,
    extraHeaders,
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

    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isInternal = authHeader === `Bearer ${SERVICE_KEY}`;

    const payload = await req.json();
    let userId: string;
    if (isInternal) {
      if (!payload?.internal_user_id) {
        return new Response(JSON.stringify({ error: "internal_user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = payload.internal_user_id;
    } else {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;
    }

    const {
      email_account_id,
      to,
      subject,
      body_html,
      body_text,
      lead_id,
      sequence_id,
      thread_key: clientThreadKey,
      in_reply_to,
    } = payload;

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

    // Block sending to unsubscribed recipients
    const toLower = String(to).toLowerCase();
    const { data: unsub } = await admin
      .from("unsubscribes")
      .select("id")
      .eq("user_id", userId)
      .eq("email", toLower)
      .maybeSingle();
    if (unsub) {
      return new Response(
        JSON.stringify({ error: "Recipient is unsubscribed", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build From with per-account sender_name override
    const fromName = account.sender_name || account.display_name;
    const fromAddr = fromName ? `${fromName} <${account.email}>` : account.email;

    // Unsubscribe token + headers
    const unsubToken = await signUnsubscribeToken(userId, toLower);
    const unsubUrl = buildUnsubscribeUrl(unsubToken);
    const localMessageId = `<${crypto.randomUUID()}@maillead.local>`;
    const extraHeaders = [
      `Message-ID: ${localMessageId}`,
      `List-Unsubscribe: <${unsubUrl}>`,
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    ];

    // Auto-append unsubscribe footer if missing in body
    const ensureUnsub = (html: string | undefined, text: string | undefined) => {
      const hasInHtml = html && /unsubscribe/i.test(html);
      const hasInText = text && /unsubscribe/i.test(text);
      const footerHtml = `<p style="margin-top:24px;font-size:12px;color:#888">If you no longer wish to receive these emails, <a href="${unsubUrl}">unsubscribe here</a>.</p>`;
      const footerText = `\n\nUnsubscribe: ${unsubUrl}`;
      return {
        html: html ? (hasInHtml ? html : html + footerHtml) : undefined,
        text: text ? (hasInText ? text : text + footerText) : (html ? undefined : footerText.trim()),
      };
    };
    const finalBody = ensureUnsub(body_html, body_text);

    let status = "sent";
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;

    try {
      if (account.auth_type === "oauth" && account.provider === "gmail") {
        const r = await sendViaGmail(
          admin,
          account,
          fromAddr,
          to,
          subject,
          finalBody.html,
          finalBody.text,
          in_reply_to,
          extraHeaders,
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
            from: fromAddr,
            to,
            subject,
            content: finalBody.text || "",
            html: finalBody.html || undefined,
            inReplyTo: in_reply_to || undefined,
            headers: {
              "List-Unsubscribe": `<${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
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

    const sentAt = status === "sent" ? new Date().toISOString() : null;
    const snippet = (body_text || (body_html ? body_html.replace(/<[^>]+>/g, " ") : "") || "").slice(0, 220);
    const normSubject = (subject ?? "").replace(/^(re|sv|fwd|fw|vs|aw)\s*:\s*/gi, "").trim().toLowerCase();
    const threadKey = clientThreadKey || in_reply_to || `subj:${normSubject}:${String(to).toLowerCase()}`;

    const { data: insertedMsg } = await admin.from("email_messages").insert({
      user_id: userId,
      email_account_id,
      lead_id: lead_id ?? null,
      sequence_id: sequence_id ?? null,
      direction: "outbound",
      from_address: account.email,
      to_address: to,
      subject,
      body_text: body_text ?? null,
      body_html: body_html ?? null,
      snippet,
      sent_at: sentAt,
      status,
      error_message: errorMessage,
      provider_message_id: providerMessageId,
      message_id_header: localMessageId,
      in_reply_to: in_reply_to ?? null,
      thread_key: threadKey,
    }).select("id").maybeSingle();

    if (status === "sent") {
      // Upsert thread for outbound
      const fromLower = String(account.email).toLowerCase();
      const toLower2 = String(to).toLowerCase();
      const { data: existingThread } = await admin
        .from("email_threads")
        .select("id, participants, message_count")
        .eq("email_account_id", email_account_id)
        .eq("thread_key", threadKey)
        .maybeSingle();
      const participants = new Set<string>(existingThread?.participants ?? []);
      participants.add(fromLower);
      participants.add(toLower2);
      if (existingThread) {
        await admin.from("email_threads").update({
          last_message_at: sentAt,
          last_snippet: snippet,
          last_direction: "outbound",
          participants: Array.from(participants),
          message_count: (existingThread.message_count ?? 0) + 1,
          lead_id: lead_id ?? null,
          sequence_id: sequence_id ?? null,
        }).eq("id", existingThread.id);
      } else {
        await admin.from("email_threads").insert({
          user_id: userId,
          email_account_id,
          thread_key: threadKey,
          subject,
          participants: Array.from(participants),
          last_message_at: sentAt,
          last_snippet: snippet,
          last_direction: "outbound",
          unread_count: 0,
          message_count: 1,
          lead_id: lead_id ?? null,
          sequence_id: sequence_id ?? null,
        });
      }
    }

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
