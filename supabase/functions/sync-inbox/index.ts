import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { simpleParser } from "npm:mailparser@3.7.2";
import { corsHeaders, decryptToken, getValidGoogleAccessToken, getValidMicrosoftAccessToken, TokenRevokedError } from "../_shared/oauth.ts";
import { ImapClient, ImapError } from "../_shared/imapClient.ts";
import { redactSecrets } from "../_shared/redactSecrets.ts";


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

  // Strategy: if we have a historyId, use Gmail History API for incremental
  // sync (cheap, exact). On first run or 404 (history expired >7d), fall back
  // to list with paging until either we exhaust pages or hit a hard cap.
  const HARD_CAP = 500;
  const ids: string[] = [];
  let newHistoryId: string | null = null;
  let historyExpired = false;

  if (account.history_id) {
    try {
      let pageToken: string | undefined;
      do {
        const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
        u.searchParams.set("startHistoryId", String(account.history_id));
        u.searchParams.set("historyTypes", "messageAdded");
        u.searchParams.set("labelId", "INBOX");
        if (pageToken) u.searchParams.set("pageToken", pageToken);
        const r = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (r.status === 404) {
          // History expired (>7d). Clear cursor so we fall back to a list-based
          // sync in THIS run, and persist null so it sticks.
          historyExpired = true;
          newHistoryId = null;
          ids.length = 0;
          await admin.from("email_accounts").update({ history_id: null }).eq("id", account.id);
          break;
        }
        if (!r.ok) {
          const t = await r.text();
          throw new Error(`Gmail history failed: ${r.status} ${t.slice(0, 200)}`);
        }
        const j = await r.json();
        if (j.historyId) newHistoryId = String(j.historyId);
        for (const h of j.history ?? []) {
          for (const ma of h.messagesAdded ?? []) {
            const id = ma.message?.id;
            if (id) ids.push(id);
          }
        }
        pageToken = j.nextPageToken;
      } while (pageToken && ids.length < HARD_CAP);
    } catch (e) {
      console.warn("history sync failed, falling back to list:", (e as Error).message);
      historyExpired = true;
    }
  }

  if (ids.length === 0 && (!account.history_id || historyExpired)) {
    // First-time sync OR history expired — list newest first with paging.
    let pageToken: string | undefined;
    do {
      const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      u.searchParams.set("q", "in:inbox -from:me newer_than:14d");
      u.searchParams.set("maxResults", "100");
      if (pageToken) u.searchParams.set("pageToken", pageToken);
      const r = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Gmail list failed: ${r.status} ${t.slice(0, 200)}`);
      }
      const j = await r.json();
      for (const m of j.messages ?? []) if (m.id) ids.push(m.id);
      pageToken = j.nextPageToken;
    } while (pageToken && ids.length < HARD_CAP);

    // Capture the current historyId so next run uses incremental sync.
    const profResp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profResp.ok) {
      const prof = await profResp.json();
      newHistoryId = prof.historyId ? String(prof.historyId) : null;
    }
  }


  // Dedupe upfront in ONE query.
  const uniqueIds = Array.from(new Set(ids));
  let toFetch = uniqueIds;
  if (uniqueIds.length > 0) {
    const { data: existing } = await admin
      .from("email_messages")
      .select("provider_message_id")
      .eq("email_account_id", account.id)
      .in("provider_message_id", uniqueIds);
    const known = new Set((existing ?? []).map((r: any) => r.provider_message_id));
    toFetch = uniqueIds.filter((id) => !known.has(id));
  }

  let inserted = 0;
  for (const id of toFetch) {
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

  const update: Record<string, unknown> = {
    last_synced_at: new Date().toISOString(),
    status_message: null,
  };
  if (newHistoryId) update.history_id = newHistoryId;
  await admin.from("email_accounts").update(update).eq("id", account.id);
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
    await cancelScheduledForLead(admin, null, null, account.user_id, bounce.bouncedEmail, "bounce");
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

  // Pause sequence on reply. Two paths:
  //  1) We matched a specific sequence via headers → pause that one.
  //  2) We only matched a lead (header chain broken) → pause every active
  //     sequence that lead is part of, so we never keep sending follow-ups
  //     after a real reply even if threading headers were stripped.
  // We intentionally ignore the per-sequence pause_on_reply toggle when the
  // lead replied: stopping sends to people who answered is a safety floor,
  // not a preference. Auto-reply detection (Auto-Submitted header) prevents
  // OOO mails from triggering this — see check below.
  const isAutoReply = /\b(out[- ]?of[- ]?office|auto[- ]?reply|automatic reply|frånvarande|automatiskt svar|semestermeddelande)\b/i.test(
    (p.subject || "") + " " + (p.snippet || ""),
  );
  if (!isAutoReply) {
    if (sequenceId) {
      await admin.from("sequence_leads")
        .update({ status: "replied" })
        .eq("sequence_id", sequenceId)
        .ilike("email", fromEmail);
      await cancelScheduledForLead(admin, sequenceId, leadId, account.user_id, fromEmail, "reply_detected");
    } else if (leadId) {
      // No sequence match from headers, but we know the lead.
      // Find ALL active sequences this lead belongs to and pause them.
      const { data: leadRows } = await admin.from("sequence_leads")
        .select("id, sequence_id, status")
        .eq("user_id", account.user_id)
        .ilike("email", fromEmail);
      for (const lr of leadRows || []) {
        if (["replied", "unsubscribed", "bounced", "completed"].includes(lr.status)) continue;
        await admin.from("sequence_leads")
          .update({ status: "replied" })
          .eq("id", lr.id);
        await cancelScheduledForLead(admin, lr.sequence_id, lr.id, account.user_id, fromEmail, "reply_detected_no_thread");
      }
    } else {
      // Last-resort: match purely on from-address against any active sequence_lead
      await cancelScheduledForLead(admin, null, null, account.user_id, fromEmail, "reply_detected_email_match");
      await admin.from("sequence_leads")
        .update({ status: "replied" })
        .eq("user_id", account.user_id)
        .ilike("email", fromEmail)
        .in("status", ["pending", "active", "in_progress"]);
    }
  }
}

async function syncOutlook(admin: any, account: any) {
  const accessToken = await getValidMicrosoftAccessToken(admin, account);
  const HARD_CAP = 500;
  const sinceIso = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const filter = `receivedDateTime ge ${sinceIso}`;
  const baseUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=100&$orderby=receivedDateTime desc&$filter=${encodeURIComponent(filter)}&$select=id,internetMessageId,internetMessageHeaders,subject,from,toRecipients,receivedDateTime,bodyPreview,body,conversationId`;

  // Page through @odata.nextLink up to HARD_CAP.
  const messages: any[] = [];
  let nextUrl: string | null = baseUrl;
  while (nextUrl && messages.length < HARD_CAP) {
    const resp = await fetch(nextUrl, {
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
    for (const m of list.value ?? []) messages.push(m);
    nextUrl = list["@odata.nextLink"] ?? null;
  }

  const accountEmailLower = String(account.email).toLowerCase();
  const candidates = messages.filter((m) => (m.from?.emailAddress?.address ?? "").toLowerCase() !== accountEmailLower);
  const ids = candidates.map((m) => m.id as string);

  // Batched dedupe.
  let known = new Set<string>();
  if (ids.length > 0) {
    const { data: existing } = await admin
      .from("email_messages")
      .select("provider_message_id")
      .eq("email_account_id", account.id)
      .in("provider_message_id", ids);
    known = new Set((existing ?? []).map((r: any) => r.provider_message_id));
  }

  let inserted = 0;
  for (const msg of candidates) {
    const providerId: string = msg.id;
    if (known.has(providerId)) continue;
    const headers = (msg.internetMessageHeaders ?? []) as { name: string; value: string }[];
    const h = (k: string) => headers.find((x) => x.name.toLowerCase() === k.toLowerCase())?.value ?? null;
    const refsRaw = h("References") || "";
    const references = refsRaw.split(/\s+/).filter(Boolean);
    const bodyHtml = msg.body?.contentType === "html" ? msg.body?.content || null : null;
    const bodyText = msg.body?.contentType === "text" ? msg.body?.content || "" : (bodyHtml ? htmlToText(bodyHtml) : "");
    const fromName = msg.from?.emailAddress?.name;
    const fromAddr = msg.from?.emailAddress?.address || "";
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

async function syncImap(admin: any, account: any): Promise<number> {
  if (!account.imap_host || !account.imap_port || !account.imap_username || !account.imap_password_enc) {
    throw new Error("IMAP not configured for this account");
  }
  const password = await decryptToken(admin, account.imap_password_enc);
  const client = new ImapClient({
    host: account.imap_host,
    port: Number(account.imap_port),
    secure: account.imap_secure !== false,
    username: account.imap_username,
    password,
  });

  const MAX_MESSAGES = 50;
  let inserted = 0;
  let newHighestUid = account.imap_last_uid ?? 0;

  try {
    await client.connect();
    try {
      await client.login();
    } catch (e: any) {
      // Auth failures: mark account as needing reconnect.
      await admin.from("email_accounts").update({
        status: "error",
        status_message: `IMAP login failed: ${(e?.message ?? "unknown").slice(0, 200)}`,
      }).eq("id", account.id);
      throw e;
    }
    const box = await client.selectInbox();

    // Detect UIDVALIDITY shift — restart from a 14-day window if we have a
    // last_uid but the mailbox got recreated/renumbered.
    let uids: number[] = [];
    const lastUid: number = account.imap_last_uid ?? 0;
    if (lastUid > 0 && box.uidNext && lastUid < box.uidNext * 10) {
      uids = await client.searchSinceUid(lastUid + 1);
    } else {
      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
      uids = await client.searchSince(since);
    }

    // Sort + cap
    uids = uids.slice(-MAX_MESSAGES);

    const accountEmailLower = String(account.email).toLowerCase();
    for (const uid of uids) {
      let msg;
      try {
        msg = await client.fetchRaw(uid);
      } catch (e: any) {
        console.warn(`IMAP fetch failed uid=${uid}:`, e?.message);
        continue;
      }
      if (!msg) continue;

      if (msg.uid > newHighestUid) newHighestUid = msg.uid;

      // Dedupe: same UID may have been processed before
      const providerId = `imap-${account.id}-${msg.uid}`;
      const { data: existing } = await admin
        .from("email_messages")
        .select("id")
        .eq("provider_message_id", providerId)
        .eq("email_account_id", account.id)
        .maybeSingle();
      if (existing) continue;

      // Parse MIME
      let parsedMail: any;
      try {
        parsedMail = await simpleParser(msg.raw);
      } catch (e: any) {
        console.warn(`MIME parse failed uid=${msg.uid}:`, e?.message);
        continue;
      }

      const fromAddr = parsedMail.from?.value?.[0]?.address ?? "";
      if (!fromAddr) continue;
      if (fromAddr.toLowerCase() === accountEmailLower) continue;

      const fromName = parsedMail.from?.value?.[0]?.name;
      const toArr: any[] = parsedMail.to?.value ?? [];
      const toStr = toArr.map((t) => t.address).filter(Boolean).join(", ") || account.email;

      const refsRaw: string = parsedMail.references ?? "";
      const references: string[] = Array.isArray(parsedMail.references)
        ? parsedMail.references
        : (refsRaw ? refsRaw.split(/\s+/).filter(Boolean) : []);

      const bodyText: string = parsedMail.text ?? "";
      const bodyHtml: string | null = parsedMail.html || null;
      const snippet = (parsedMail.text || (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ") : "")).slice(0, 220);

      const parsed: ParsedMessage = {
        message_id_header: parsedMail.messageId ?? null,
        in_reply_to: parsedMail.inReplyTo ?? null,
        references,
        thread_id: null,
        from: fromName ? `${fromName} <${fromAddr}>` : fromAddr,
        to: toStr,
        subject: parsedMail.subject ?? "",
        date: (parsedMail.date instanceof Date ? parsedMail.date : new Date()).toISOString(),
        body_text: bodyText,
        body_html: bodyHtml,
        snippet,
      };

      await persistInbound(admin, account, parsed, providerId);
      inserted++;
    }
  } finally {
    try { await client.logout(); } catch (_) { /* noop */ }
  }

  // Persist progress + clear any error
  await admin.from("email_accounts").update({
    last_synced_at: new Date().toISOString(),
    status_message: null,
    imap_last_uid: newHighestUid > 0 ? newHighestUid : null,
  }).eq("id", account.id);

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
      .select("id, user_id, email, provider, auth_type, access_token_enc, refresh_token_enc, token_expires_at, status, history_id, imap_last_uid, imap_host, imap_port, imap_secure, imap_username, imap_password_enc")
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
        } else if (acc.auth_type === "smtp" && acc.imap_host) {
          totalNew += await syncImap(admin, acc);
        } else {
          // SMTP without IMAP — no inbound sync possible
          continue;
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error("sync failed for", acc.email, msg);
        errors.push({ account: acc.email, error: msg });
        if (e instanceof TokenRevokedError) {
          // Account already flagged inside oauth helper, but ensure status flips.
          await admin.from("email_accounts")
            .update({
              status: "error",
              status_message: `invalid_grant: Anslutningen har gått ut — återanslut ${e.provider}-kontot.`,
            })
            .eq("id", acc.id);
        } else {
          await admin.from("email_accounts")
            .update({ status_message: `Sync error: ${redactSecrets(msg).slice(0, 200)}` })
            .eq("id", acc.id);
        }
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
