// Shared OAuth helpers for Google (and later Microsoft).
// Used by oauth-start, oauth-callback, send-email, sync-inbox.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------- HMAC-signed state ----------

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface OAuthState {
  user_id: string;
  provider: string;
  redirect_uri: string;
  nonce: string;
  exp: number; // unix ms
}

export async function signState(state: OAuthState): Promise<string> {
  const secret = Deno.env.get("OAUTH_STATE_SECRET");
  if (!secret) throw new Error("OAUTH_STATE_SECRET is not configured");
  const payload = b64urlEncode(enc.encode(JSON.stringify(state)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(payload)),
  );
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifyState(token: string): Promise<OAuthState> {
  const secret = Deno.env.get("OAUTH_STATE_SECRET");
  if (!secret) throw new Error("OAUTH_STATE_SECRET is not configured");
  const [payload, sig] = token.split(".");
  if (!payload || !sig) throw new Error("Malformed state");
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(sig),
    enc.encode(payload),
  );
  if (!ok) throw new Error("Invalid state signature");
  const state = JSON.parse(dec.decode(b64urlDecode(payload))) as OAuthState;
  if (Date.now() > state.exp) throw new Error("State expired");
  return state;
}

// ---------- Token encryption ----------

function bytesToHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.substr(i * 2, 2), 16);
  }
  return out;
}

// Returns a Postgres bytea-compatible `\x...` hex string. We deliberately
// do NOT return Uint8Array, because supabase-js will JSON.stringify a
// Uint8Array into `{"0":..,"1":..}` when sent to PostgREST, corrupting bytea
// columns. A `\x` hex string round-trips correctly into bytea.
export async function encryptToken(
  admin: ReturnType<typeof createClient>,
  plaintext: string,
): Promise<string> {
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  const { data, error } = await admin.rpc("encrypt_secret", {
    plaintext,
    key,
  });
  if (error) throw new Error(`encrypt_secret failed: ${error.message}`);
  if (typeof data === "string") {
    return data.startsWith("\\x") ? data : bytesToHex(new TextEncoder().encode(data));
  }
  if (data instanceof Uint8Array) return bytesToHex(data);
  throw new Error("Unexpected encrypt_secret response shape");
}

export async function decryptToken(
  admin: ReturnType<typeof createClient>,
  ciphertext: Uint8Array | string | Record<string, number> | null,
): Promise<string> {
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  if (ciphertext == null) {
    throw new Error("Missing token — please reconnect this email account");
  }

  // Normalize whatever PostgREST or callers give us into raw ciphertext bytes.
  let bytes: Uint8Array;
  if (typeof ciphertext === "string") {
    bytes = ciphertext.startsWith("\\x")
      ? hexToBytes(ciphertext)
      : new TextEncoder().encode(ciphertext);
  } else if (ciphertext instanceof Uint8Array) {
    bytes = ciphertext;
  } else if (typeof ciphertext === "object") {
    // Already JSON-deserialized Uint8Array shape: {"0":..,"1":..}
    const obj = ciphertext as Record<string, number>;
    const len = Object.keys(obj).length;
    bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = obj[String(i)] ?? 0;
  } else {
    throw new Error("Unsupported ciphertext type");
  }

  // Legacy fix: earlier versions stored a Uint8Array via supabase-js, which
  // was JSON.stringify'd into bytea as ASCII text like `{"0":195,"1":13,...}`.
  // Detect that shape and reconstruct the original ciphertext bytes so
  // pgp_sym_decrypt can read them.
  if (bytes.length > 2 && bytes[0] === 0x7b /* '{' */) {
    try {
      const text = new TextDecoder().decode(bytes);
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object" && "0" in obj) {
        const len = Object.keys(obj).length;
        const real = new Uint8Array(len);
        for (let i = 0; i < len; i++) real[i] = obj[String(i)] ?? 0;
        bytes = real;
      }
    } catch {
      // not legacy JSON — fall through
    }
  }

  const { data, error } = await admin.rpc("decrypt_secret", {
    ciphertext: bytesToHex(bytes),
    key,
  });
  if (error) throw new Error(`decrypt_secret failed: ${error.message}`);
  return data as string;
}

// ---------- Google OAuth config ----------

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

export function googleAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint?: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeGoogleCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${txt}`);
  }
  return await res.json();
}

export class TokenRevokedError extends Error {
  provider: string;
  constructor(provider: string, message: string) {
    super(message);
    this.name = "TokenRevokedError";
    this.provider = provider;
  }
}

function isPermanentTokenError(status: number, body: string): boolean {
  // Google + Microsoft both signal revoked/expired refresh tokens via
  // `invalid_grant`. 400/401 with that code is permanent — user must reconnect.
  if (status !== 400 && status !== 401) return false;
  return /invalid_grant|AADSTS7000(8|82)|AADSTS50173|AADSTS54005/i.test(body);
}

async function markAccountTokenRevoked(
  admin: ReturnType<typeof createClient>,
  accountId: string,
  provider: string,
  detail: string,
) {
  try {
    await admin
      .from("email_accounts")
      .update({
        status: "error",
        status_message: `invalid_grant: Anslutningen har gått ut — återanslut ${provider}-kontot. (${detail.slice(0, 120)})`,
      })
      .eq("id", accountId);
  } catch (_) { /* best effort */ }
}

export async function refreshGoogleToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    if (isPermanentTokenError(res.status, txt)) {
      throw new TokenRevokedError("google", `Google token revoked: ${txt.slice(0, 200)}`);
    }
    throw new Error(`Google token refresh failed: ${res.status} ${txt}`);
  }
  return await res.json();
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}> {
  const res = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return await res.json();
}

// ---------- Get a valid access token for an account (refresh if needed) ----------

// ---------- Microsoft OAuth config ----------

export const MICROSOFT_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Send",
  "Mail.Read",
  "Mail.ReadWrite",
];

export function microsoftAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint?: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: MICROSOFT_SCOPES.join(" "),
    response_mode: "query",
    prompt: "select_account",
    state: opts.state,
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeMicrosoftCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    scope: MICROSOFT_SCOPES.join(" "),
  });
  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Microsoft token exchange failed: ${res.status} ${txt}`);
  }
  return await res.json();
}

export async function refreshMicrosoftToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: "refresh_token",
    scope: MICROSOFT_SCOPES.join(" "),
  });
  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Microsoft token refresh failed: ${res.status} ${txt}`);
  }
  return await res.json();
}

export async function fetchMicrosoftUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name?: string;
}> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Microsoft userinfo failed: ${res.status}`);
  const j = await res.json();
  return {
    id: j.id,
    email: j.mail || j.userPrincipalName,
    name: j.displayName,
  };
}

export async function getValidMicrosoftAccessToken(
  admin: ReturnType<typeof createClient>,
  account: {
    id: string;
    access_token_enc: Uint8Array | string | null;
    refresh_token_enc: Uint8Array | string | null;
    token_expires_at: string | null;
  },
): Promise<string> {
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;
  if (expiresAt - Date.now() > 60_000 && account.access_token_enc) {
    return await decryptToken(admin, account.access_token_enc);
  }
  if (!account.refresh_token_enc) {
    throw new Error("No refresh token on file — reconnect the account");
  }
  const refreshToken = await decryptToken(admin, account.refresh_token_enc);
  const tokens = await refreshMicrosoftToken({
    refreshToken,
    clientId: Deno.env.get("MICROSOFT_CLIENT_ID")!,
    clientSecret: Deno.env.get("MICROSOFT_CLIENT_SECRET")!,
  });
  const newAccessEnc = await encryptToken(admin, tokens.access_token);
  const update: Record<string, unknown> = {
    access_token_enc: newAccessEnc,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    status: "active",
    status_message: null,
  };
  if (tokens.refresh_token) {
    update.refresh_token_enc = await encryptToken(admin, tokens.refresh_token);
  }
  await admin.from("email_accounts").update(update).eq("id", account.id);
  return tokens.access_token;
}

// ---------- Get a valid Google access token (refresh if needed) ----------

export async function getValidGoogleAccessToken(
  admin: ReturnType<typeof createClient>,
  account: {
    id: string;
    access_token_enc: Uint8Array | string | null;
    refresh_token_enc: Uint8Array | string | null;
    token_expires_at: string | null;
  },
): Promise<string> {
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;
  // Refresh if <60s remaining
  if (expiresAt - Date.now() > 60_000 && account.access_token_enc) {
    return await decryptToken(admin, account.access_token_enc);
  }
  if (!account.refresh_token_enc) {
    throw new Error("No refresh token on file — reconnect the account");
  }
  const refreshToken = await decryptToken(admin, account.refresh_token_enc);
  const tokens = await refreshGoogleToken({
    refreshToken,
    clientId: Deno.env.get("GOOGLE_CLIENT_ID")!,
    clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
  });
  const newAccessEnc = await encryptToken(admin, tokens.access_token);
  await admin
    .from("email_accounts")
    .update({
      access_token_enc: newAccessEnc,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000)
        .toISOString(),
      status: "active",
      status_message: null,
    })
    .eq("id", account.id);
  return tokens.access_token;
}
