import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, decryptToken, getValidGoogleAccessToken, getValidMicrosoftAccessToken } from "../_shared/oauth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ParsedMessage {
  message_id_header: string | null;
  in_reply_to: string | null;
  references: string[];
  thread_id: string | null;
  from: string;
  to: string;
  subject: string;
  date: string;
  body_text: string;
  body_html: string | null;
  snippet: string;
}

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractParts(payload: any, out: { text: string[]; html: string[] }) {
  if (!payload) return;
  const mime = payload.mimeType || "";
  const data = payload.body?.data;
  if (data) {
    if (mime.startsWith("text/plain")) out.text.push(decodeBase64Url(data));
    else if (mime.startsWith("text/html")) out.html.push(decodeBase64Url(data));
  }
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) extractParts(p, out);
  }
}

function parseGmailMessage(msg: any): ParsedMessage {
  const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];
  const h = (k: string) => headers.find((x) => x.name.toLowerCase() === k.toLowerCase())?.value ?? "";
  const parts = { text: [] as string[], html: [] as string[] };
  extractParts(msg.payload, parts);
  const bodyHtml = parts.html.join("\n") || null;
  const bodyText = parts.text.join("\n") || (bodyHtml ? htmlToText(bodyHtml) : "");
  const refs = (h("References") || "").split(/\s+/).filter(Boolean);
  return {
    message_id_header: h("Message-ID") || h("Message-Id") || null,
    in_reply_to: h("In-Reply-To") || null,
    references: refs,
    thread_id: msg.threadId ?? null,
    from: h("From"),
    to: h("To"),
    subject: h("Subject"),
    date: h("Date") || new Date(Number(msg.internalDate ?? Date.now())).toISOString(),
    body_text: bodyText,
    body_html: bodyHtml,
    snippet: (msg.snippet ?? bodyText.slice(0, 160)).slice(0, 220),
  };
}

function normalizeSubject(subject: string): string {
  return (subject ?? "")
    .replace(/^(re|sv|fwd|fw|vs|aw)\s*:\s*/gi, "")
    .replace(/^(re|sv|fwd|fw|vs|aw)\s*:\s*/gi, "")
    .trim()
    .toLowerCase();
}

function extractEmail(addr: string): string {
  const m = (addr ?? "").match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim().toLowerCase();
}

async function syncGmail(admin: any, account: any) {
  const accessToken = await getValidGoogleAccessToken(admin, account);
  const url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" +
    encodeURIComponent("in:inbox -from:me newer_than:14d") + "&maxResults=50";
  const listResp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listResp.ok) {
    const t = await listResp.text();
    throw new Error(`Gmail list failed: ${listResp.status} ${t.slice(0, 200)}`);
  }
  const list = await listResp.json();
  const ids: string[] = (list.messages ?? []).map((m: any) => m.id);
  let inserted = 0;
  for (const id of ids) {
    // Skip if already stored
    const { data: existing } = await admin
      .from("email_messages")
      .select("id")
      .eq("provider_message_id", id)
      .eq("email_account_id", account.id)
      .maybeSingle();
    if (existing) continue;

    const detResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!detResp.ok) continue;
    const msg = await detResp.json();
    const parsed = parseGmailMessage(msg);
    await persistInbound(admin, account, parsed, id);
    inserted++;
  }
  await admin
    .from("email_accounts")
    .update({ last_synced_at: new Date().toISOString(), status_message: null })
    .eq("id", account.id);
  return inserted;
}

function detectBounce(p: ParsedMessage, fromEmail: string): { isBounce: boolean; bouncedEmail: string | null; reason: string | null } {
  const subject = (p.subject || "").toLowerCase();
  const isFromMailer = /mailer-daemon|postmaster|mail-daemon/i.test(fromEmail);
  const subjectMatches = /^(undeliverable|undelivered|delivery (status notification|failure|incomplete)|mail delivery (failed|failure|notification)|returned mail|failure notice)/i.test(subject);
  if (!isFromMailer && !subjectMatches) return { isBounce: false, bouncedEmail: null, reason: null };
  const body = `${p.body_text || ""}\n${p.body_html || ""}`;
  const m = body.match(/(?:Final-Recipient|Original-Recipient|To|recipient)[^\n<]*[<:\s]\s*([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})/i)
    || body.match(/<([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})>/i);
  const bouncedEmail = m ? m[1].toLowerCase() : null;
  const reasonMatch = body.match(/(?:Diagnostic-Code|Status|reason)[^\n]{0,200}/i);
  return { isBounce: true, bouncedEmail, reason: reasonMatch ? reasonMatch[0].slice(0, 500) : subject };
}

async function cancelScheduledForLead(
  admin: any,
  sequenceId: string | null,
  leadId: string | null,
  userId: string,
  email?: string,
  reason: string = "reply_detected",
) {
  if (leadId && sequenceId) {
    await admin.from("scheduled_sends")
      .update({ status: "cancelled", cancelled_reason: reason })
      .eq("sequence_id", sequenceId).eq("lead_id", leadId).eq("status", "scheduled");
  } else if (leadId) {
    // Cancel across any sequence this lead is in
    await admin.from("scheduled_sends")
      .update({ status: "cancelled", cancelled_reason: reason })
      .eq("lead_id", leadId).eq("status", "scheduled");
  } else if (email) {
    const { data: sLeads } = await admin.from("sequence_leads")
      .select("id, sequence_id").eq("user_id", userId).ilike("email", email);
    for (const sl of sLeads || []) {
      await admin.from("scheduled_sends")
        .update({ status: "cancelled", cancelled_reason: reason })
        .eq("sequence_id", sl.sequence_id).eq("lead_id", sl.id).eq("status", "scheduled");
    }
  }
}

async function persistInbound(admin: any, account: any, p: ParsedMessage, providerMessageId: string) {
  // Try to match a previous outbound to attach lead_id/sequence_id
  let leadId: string | null = null;
  let sequenceId: string | null = null;
  const fromEmail = extractEmail(p.from);

  // Bounce detection — handle and short-circuit
  const bounce = detectBounce(p, fromEmail);
  if (bounce.isBounce && bounce.bouncedEmail) {
    await admin.from("bounces").insert({
      user_id: account.user_id,
      email: bounce.bouncedEmail,
      reason: bounce.reason,
      hard: true,
    });
    await admin.from("sequence_leads")
      .update({ status: "bounced" })
      .eq("user_id", account.user_id)
      .ilike("email", bounce.bouncedEmail);
    await cancelScheduledForLead(admin, null, null, account.user_id, bounce.bouncedEmail);
    // still record the bounce email in messages for visibility
  }
  let priorThreadKey: string | null = null;
  const refIds = [p.in_reply_to, ...p.references].filter(Boolean) as string[];
  if (refIds.length > 0) {
    const { data: prior } = await admin
      .from("email_messages")
      .select("lead_id, sequence_id, thread_key")
      .eq("user_id", account.user_id)
      .in("message_id_header", refIds)
      .maybeSingle();
    if (prior) {
      leadId = prior.lead_id ?? null;
      sequenceId = prior.sequence_id ?? null;
      priorThreadKey = prior.thread_key ?? null;
    }
  }
  if (!leadId) {
    const { data: lead } = await admin
      .from("sequence_leads")
      .select("id")
      .eq("user_id", account.user_id)
      .ilike("email", fromEmail)
      .maybeSingle();
    if (lead) leadId = lead.id;
  }

  const threadKey = priorThreadKey || p.thread_id || p.references[0] || p.in_reply_to || `subj:${normalizeSubject(p.subject)}:${fromEmail}`;

  const receivedAt = (() => {
    const d = new Date(p.date);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  })();

  const isLeadRelated = !!leadId || !!sequenceId;

  const { data: inserted, error: insErr } = await admin.from("email_messages").insert({
    user_id: account.user_id,
    email_account_id: account.id,
    lead_id: leadId,
    sequence_id: sequenceId,
    direction: "inbound",
    provider_message_id: providerMessageId,
    message_id_header: p.message_id_header,
    in_reply_to: p.in_reply_to,
    thread_id: p.thread_id,
    thread_key: threadKey,
    from_address: fromEmail,
    to_address: account.email,
    subject: p.subject,
    body_text: p.body_text,
    body_html: p.body_html,
    snippet: p.snippet,
    received_at: receivedAt,
    status: "received",
    is_read: false,
    is_lead_related: isLeadRelated,
  }).select("id").maybeSingle();

  if (insErr) {
    console.error("insert inbound failed", insErr);
    return;
  }

  // Trigger AI analysis only for lead-related inbound (saves credits, avoids noise)
  if (inserted?.id && isLeadRelated) {
    const analyzeUrl = `${SUPABASE_URL}/functions/v1/analyze-inbound-email`;
    fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ message_id: inserted.id }),
    }).catch((e) => console.error("analyze trigger failed", e));
  }

  // Upsert thread
  const { data: existingThread } = await admin
    .from("email_threads")
    .select("id, participants, message_count, unread_count, is_lead_related")
    .eq("email_account_id", account.id)
    .eq("thread_key", threadKey)
    .maybeSingle();

  const participants = new Set<string>(existingThread?.participants ?? []);
  participants.add(fromEmail);
  participants.add(account.email.toLowerCase());

  const threadLeadRelated = isLeadRelated || !!existingThread?.is_lead_related;

  if (existingThread) {
    await admin.from("email_threads").update({
      last_message_at: receivedAt,
      last_snippet: p.snippet,
      last_direction: "inbound",
      participants: Array.from(participants),
      unread_count: (existingThread.unread_count ?? 0) + 1,
      message_count: (existingThread.message_count ?? 0) + 1,
      lead_id: leadId,
      sequence_id: sequenceId,
      is_archived: false,
      is_lead_related: threadLeadRelated,
    }).eq("id", existingThread.id);
  } else {
    await admin.from("email_threads").insert({
      user_id: account.user_id,
      email_account_id: account.id,
      thread_key: threadKey,
      subject: p.subject,
      participants: Array.from(participants),
      last_message_at: receivedAt,
      last_snippet: p.snippet,
      last_direction: "inbound",
      unread_count: 1,
      message_count: 1,
      lead_id: leadId,
      sequence_id: sequenceId,
      is_lead_related: threadLeadRelated,
    });
  }

  // Pause sequence on reply if configured + cancel scheduled
  if (sequenceId) {
    const { data: seq } = await admin.from("sequences")
      .select("pause_on_reply").eq("id", sequenceId).maybeSingle();
    if (seq?.pause_on_reply) {
      await admin.from("sequence_leads")
        .update({ status: "replied" })
        .eq("sequence_id", sequenceId)
        .ilike("email", fromEmail);
      await cancelScheduledForLead(admin, sequenceId, leadId, account.user_id, fromEmail);
    }
  }
}

async function syncOutlook(admin: any, account: any) {
  const accessToken = await getValidMicrosoftAccessToken(admin, account);
  // Last 14 days, inbox, not from self
  const sinceIso = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const filter = `receivedDateTime ge ${sinceIso}`;
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$filter=${encodeURIComponent(filter)}&$select=id,internetMessageId,internetMessageHeaders,subject,from,toRecipients,receivedDateTime,bodyPreview,body,conversationId`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="html"',
    },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Outlook list failed: ${resp.status} ${t.slice(0, 200)}`);
  }
  const list = await resp.json();
  const accountEmailLower = String(account.email).toLowerCase();
  let inserted = 0;
  for (const msg of list.value ?? []) {
    const fromAddr = msg.from?.emailAddress?.address || "";
    if (fromAddr.toLowerCase() === accountEmailLower) continue;
    const providerId: string = msg.id;
    const { data: existing } = await admin
      .from("email_messages")
      .select("id")
      .eq("provider_message_id", providerId)
      .eq("email_account_id", account.id)
      .maybeSingle();
    if (existing) continue;

    const headers = (msg.internetMessageHeaders ?? []) as { name: string; value: string }[];
    const h = (k: string) => headers.find((x) => x.name.toLowerCase() === k.toLowerCase())?.value ?? null;
    const refsRaw = h("References") || "";
    const references = refsRaw.split(/\s+/).filter(Boolean);
    const bodyHtml = msg.body?.contentType === "html" ? msg.body?.content || null : null;
    const bodyText = msg.body?.contentType === "text" ? msg.body?.content || "" : (bodyHtml ? htmlToText(bodyHtml) : "");
    const fromName = msg.from?.emailAddress?.name;
    const toAddr = (msg.toRecipients ?? []).map((r: any) => r.emailAddress?.address).filter(Boolean).join(", ");

    const parsed: ParsedMessage = {
      message_id_header: msg.internetMessageId || h("Message-ID") || null,
      in_reply_to: h("In-Reply-To"),
      references,
      thread_id: msg.conversationId ?? null,
      from: fromName ? `${fromName} <${fromAddr}>` : fromAddr,
      to: toAddr || account.email,
      subject: msg.subject || "",
      date: msg.receivedDateTime || new Date().toISOString(),
      body_text: bodyText,
      body_html: bodyHtml,
      snippet: (msg.bodyPreview || bodyText.slice(0, 160)).slice(0, 220),
    };
    await persistInbound(admin, account, parsed, providerId);
    inserted++;
  }
  await admin
    .from("email_accounts")
    .update({ last_synced_at: new Date().toISOString(), status_message: null })
    .eq("id", account.id);
  return inserted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isInternal = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    const internalUserId = req.headers.get("x-internal-user-id");
    let userId: string;

    if (isInternal && internalUserId) {
      userId = internalUserId;
    } else {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: accounts } = await admin
      .from("email_accounts")
      .select("id, user_id, email, provider, auth_type, access_token_enc, refresh_token_enc, token_expires_at, status, history_id, imap_last_uid")
      .eq("user_id", userId)
      .eq("status", "active");

    let totalNew = 0;
    const errors: { account: string; error: string }[] = [];
    for (const acc of accounts ?? []) {
      try {
        if (acc.auth_type === "oauth" && (acc.provider === "gmail" || acc.provider === "google")) {
          totalNew += await syncGmail(admin, acc);
        } else if (acc.auth_type === "oauth" && acc.provider === "outlook") {
          totalNew += await syncOutlook(admin, acc);
        } else {
          // IMAP path not yet implemented in this iteration
          continue;
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error("sync failed for", acc.email, msg);
        errors.push({ account: acc.email, error: msg });
        await admin.from("email_accounts")
          .update({ status_message: `Sync error: ${msg.slice(0, 200)}` })
          .eq("id", acc.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, new_messages: totalNew, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-inbox error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
