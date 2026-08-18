import type { TFunction } from "i18next";
import i18n from "@/i18n/config";

/**
 * Central error → user-facing message mapper.
 *
 * Accepts anything thrown by supabase.functions.invoke, fetch, the supabase-js
 * client, or a plain Error / string, and returns a localized message.
 *
 * Server-side functions are encouraged to return a structured payload:
 *   { error: { code: "smtp_auth_failed", message: "...", detail: "535 ..." } }
 * but legacy `{ error: "string" }` and raw Error objects are also handled.
 */

type StructuredError = {
  code?: string;
  message?: string;
  detail?: string;
};

const KNOWN_CODES: Record<string, string> = {
  // SMTP
  smtp_missing_fields: "errors.smtp.missingFields",
  smtp_auth_failed: "errors.smtp.authFailed",
  smtp_connection_refused: "errors.smtp.connectionRefused",
  smtp_host_not_found: "errors.smtp.hostNotFound",
  smtp_tls_failed: "errors.smtp.tlsFailed",
  smtp_timeout: "errors.smtp.timeout",
  smtp_personal_outlook_blocked: "errors.smtp.personalOutlookBlocked",
  smtp_app_password_required: "errors.smtp.appPasswordRequired",
  smtp_host_not_allowed: "errors.smtp.hostNotAllowed",
  smtp_sender_blocked: "errors.smtp.senderBlocked",
  smtp_generic: "errors.smtp.genericNoDetail",
  // IMAP
  imap_missing_fields: "errors.imap.missingFields",
  imap_auth_failed: "errors.imap.authFailed",
  imap_connection_refused: "errors.imap.connectionRefused",
  imap_host_not_found: "errors.imap.hostNotFound",
  imap_host_not_allowed: "errors.imap.hostNotAllowed",
  imap_tls_failed: "errors.imap.tlsFailed",
  imap_tls_required: "errors.imap.tlsRequired",
  imap_timeout: "errors.imap.timeout",
  imap_generic: "errors.imap.generic",
  // Send
  gmail_auth_expired: "errors.send.gmailAuthExpired",
  outlook_auth_expired: "errors.send.outlookAuthExpired",
  send_rate_limited: "errors.send.rateLimited",
  send_quota_exceeded: "errors.send.quotaExceeded",
  recipient_refused: "errors.send.recipientRefused",
  // AI
  no_credits: "errors.ai.noCredits",
  rate_limited: "errors.ai.rateLimited",
  missing_company: "errors.ai.missingCompany",
  ai_failed: "errors.ai.generationFailed",
  // Upload
  file_too_large: "errors.upload.tooLarge",
  unsupported_file_type: "errors.upload.unsupportedType",
  no_rows: "errors.upload.noRows",
  parse_failed: "errors.upload.parseFailed",
  // Import
  gdpr_required: "errors.import.gdprRequired",
  invalid_email: "errors.import.invalidEmail",
  duplicate_lead: "errors.import.duplicate",
  // Auth
  unauthorized: "errors.generic.unauthorized",
  invalid_credentials: "errors.auth.invalidCredentials",
  email_not_confirmed: "errors.auth.emailNotConfirmed",
  user_already_exists: "errors.auth.userAlreadyExists",
  weak_password: "errors.auth.weakPassword",
  auth_rate_limited: "errors.auth.rateLimited",
  // Microsoft OAuth (consent / token errors)
  google_oauth_disabled: "errors.oauth.googleDisabled",
  access_denied: "errors.oauth.userDeclined",
  consent_required: "errors.oauth.userDeclined",
  admin_consent_required: "errors.oauth.adminConsentRequired",
  microsoft_admin_consent_required: "errors.oauth.adminConsentRequired",
  microsoft_account_unsupported: "errors.oauth.microsoftAccountUnsupported",
  microsoft_misconfigured: "errors.oauth.microsoftMisconfigured",
};

const SUPABASE_AUTH_MAP: Record<string, string> = {
  "invalid login credentials": "errors.auth.invalidCredentials",
  "invalid credentials": "errors.auth.invalidCredentials",
  "email not confirmed": "errors.auth.emailNotConfirmed",
  "user already registered": "errors.auth.userAlreadyExists",
  "user already exists": "errors.auth.userAlreadyExists",
  "password should be at least": "errors.auth.weakPassword",
  "pwned": "errors.auth.leakedPassword",
  "leaked password": "errors.auth.leakedPassword",
  "email rate limit exceeded": "errors.auth.rateLimited",
  "over_email_send_rate_limit": "errors.auth.rateLimited",
  "signup is disabled": "errors.auth.signupDisabled",
  "signups not allowed": "errors.auth.signupDisabled",
};

function matchFreeText(
  raw: string,
): { key: string; opts?: Record<string, unknown> } | null {
  const m = raw.toLowerCase();

  // Plan-gates (kastas av DB-triggers)
  if (m.includes("plan_limit_exceeded:email_accounts")) {
    return { key: "errors.plan.emailAccountsLimit" };
  }
  if (m.includes("plan_limit_exceeded:campaigns")) {
    return { key: "errors.plan.campaignsLimit" };
  }

  if (m.includes("failed to fetch") || m.includes("networkerror") || m === "load failed") {
    return { key: "errors.generic.network" };
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return { key: "errors.generic.timeout" };
  }

  if (m.includes("sender address blocked") || m.includes("5.1.8") ||
      m.includes("relay access denied") || m.includes("relaying denied")) {
    return { key: "errors.smtp.senderBlocked" };
  }
  if (m.includes("smtp.office365.com") && (m.includes("535") || m.includes("5.7.139"))) {
    return { key: "errors.smtp.personalOutlookBlocked" };
  }
  if (m.includes("535") || m.includes("authentication unsuccessful") || m.includes("authentication failed") || m.includes("invalid login") || m.includes("username and password not accepted")) {
    return { key: "errors.smtp.authFailed" };
  }
  if (m.includes("enotfound") || m.includes("getaddrinfo") || m.includes("name or service not known")) {
    const host = raw.match(/[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "";
    return { key: "errors.smtp.hostNotFound", opts: { host } };
  }
  if (m.includes("econnrefused") || m.includes("connection refused")) {
    return { key: "errors.smtp.connectionRefused" };
  }
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate")) {
    return { key: "errors.smtp.tlsFailed" };
  }
  if (m.includes("missing smtp")) {
    return { key: "errors.smtp.missingFields" };
  }

  if (m.includes("gmail send failed") && (m.includes("401") || m.includes("invalid_grant"))) {
    return { key: "errors.send.gmailAuthExpired" };
  }
  if (m.includes("outlook send failed") && (m.includes("401") || m.includes("invalid_grant"))) {
    return { key: "errors.send.outlookAuthExpired" };
  }

  // Microsoft Entra (AADSTS) error codes
  if (m.includes("aadsts65001") || m.includes("admin_consent")) {
    return { key: "errors.oauth.adminConsentRequired" };
  }
  if (m.includes("aadsts50020") || m.includes("aadsts50194")) {
    return { key: "errors.oauth.microsoftAccountUnsupported" };
  }
  if (m.includes("aadsts7000218") || m.includes("aadsts700016") || m.includes("aadsts50011")) {
    return { key: "errors.oauth.microsoftMisconfigured" };
  }
  if (m.includes("aadsts65004") || m === "access_denied" || m.includes("user_cancelled") || m.includes("user canceled")) {
    return { key: "errors.oauth.userDeclined" };
  }


  for (const [needle, key] of Object.entries(SUPABASE_AUTH_MAP)) {
    if (m.includes(needle)) return { key };
  }

  return null;
}

function trimDetail(s: string, max = 140): string {
  const cleaned = s.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + "…" : cleaned;
}

function extractStructured(err: unknown): StructuredError | null {
  if (!err || typeof err !== "object") return null;
  const anyErr = err as any;
  const candidates = [anyErr, anyErr.error, anyErr.context, anyErr.data?.error];
  for (const c of candidates) {
    if (c && typeof c === "object" && (c.code || c.message)) {
      return { code: c.code, message: c.message, detail: c.detail };
    }
  }
  return null;
}

/**
 * supabase.functions.invoke kastar ett FunctionsHttpError vid non-2xx utan att
 * läsa svarskroppen — den strukturerade felkoden går då förlorad. Den här
 * hjälpfunktionen packar upp kroppen ur `error.context` (ett Response-objekt)
 * så att toUserMessage kan mappa koden till ett begripligt meddelande.
 */
export async function unwrapFunctionError(err: unknown): Promise<unknown> {
  const ctx = (err as any)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const res = typeof ctx.clone === "function" ? ctx.clone() : ctx;
      const body = await res.json();
      if (body?.error) return body.error;
      if (body && typeof body === "object") return body;
    } catch {
      /* ignore — kroppen var inte JSON */
    }
  }
  return err;
}

/** Rensar bort platshållare som aldrig fylldes i (t.ex. ": {{detail}}"). */
function sanitize(msg: string, fallback: string): string {
  const cleaned = msg
    .replace(/\{\{\s*\w+\s*\}\}/g, "")
    .replace(/\[\[\s*\w+\s*\]\]/g, "")
    .replace(/[:\-–]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned || cleaned === ":") return fallback;
  return cleaned;
}

/**
 * Vissa felkoder har leverantörsspecifika råd. Gmail/Outlook kräver
 * app-lösenord, medan vanliga webbhotell använder samma lösenord som
 * webbmailen — då är app-lösenordstexten missvisande.
 */
function authFailedKey(code: string, host?: string): string | null {
  if (code !== "smtp_auth_failed" && code !== "imap_auth_failed") return null;
  const h = (host ?? "").toLowerCase();
  const isGoogle = h.includes("gmail") || h.includes("google");
  const isMicrosoft = h.includes("outlook") || h.includes("hotmail") || h.includes("office365");
  if (isGoogle || isMicrosoft) return null; // behåll befintlig app-lösenordstext
  return code === "smtp_auth_failed"
    ? "errors.smtp.authFailedGeneric"
    : "errors.imap.authFailedGeneric";
}

export function toUserMessage(
  err: unknown,
  tArg?: TFunction,
  fallbackKey?: string,
  opts?: { host?: string },
): string {
  const t = (tArg ?? (i18n.t.bind(i18n) as unknown as TFunction));
  const unknownMsg = t("errors.generic.unknown");
  const render = (key: string, o?: Record<string, unknown>) =>
    sanitize(String(t(key, o ?? {})), unknownMsg);

  if (err == null) return render(fallbackKey ?? "errors.generic.unknown");

  const structured = extractStructured(err);
  if (structured?.code && KNOWN_CODES[structured.code]) {
    const key = authFailedKey(structured.code, opts?.host) ?? KNOWN_CODES[structured.code];
    return render(key, { detail: structured.detail ?? "" });
  }


  let raw = "";
  if (typeof err === "string") raw = err;
  else if (err instanceof Error) raw = err.message;
  else if (structured?.message) raw = structured.message;
  else if (typeof (err as any)?.message === "string") raw = (err as any).message;

  if (raw) {
    const match = matchFreeText(raw);
    if (match) {
      const key = match.key === "errors.smtp.authFailed"
        ? (authFailedKey("smtp_auth_failed", opts?.host) ?? match.key)
        : match.key;
      return render(key, match.opts);
    }
  }

  if (fallbackKey) return render(fallbackKey, { detail: raw ? trimDetail(raw) : "" });

  if (raw) return render("errors.generic.withDetail", { detail: trimDetail(raw) });
  return unknownMsg;
}

/** Plockar ut felkod och teknisk detalj för visning i UI. */
export function extractErrorInfo(err: unknown): { code?: string; detail?: string } {
  const s = extractStructured(err);
  const detail = s?.detail ?? (err instanceof Error ? err.message : typeof err === "string" ? err : undefined);
  return { code: s?.code, detail: detail ? trimDetail(detail, 200) : undefined };
}

/** True när felet beror på avvisad inloggning (SMTP eller IMAP). */
export function isAuthFailure(err: unknown): boolean {
  const { code, detail } = extractErrorInfo(err);
  if (code === "smtp_auth_failed" || code === "imap_auth_failed") return true;
  const m = (detail ?? "").toLowerCase();
  return m.includes("535") || m.includes("authenticationfailed") || m.includes("authentication failed");
}


