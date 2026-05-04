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

export async function encryptToken(
  admin: ReturnType<typeof createClient>,
  plaintext: string,
): Promise<Uint8Array> {
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  const { data, error } = await admin.rpc("encrypt_secret", {
    plaintext,
    key,
  });
  if (error) throw new Error(`encrypt_secret failed: ${error.message}`);
  // PostgREST returns bytea as a `\x...` hex string
  if (typeof data === "string" && data.startsWith("\\x")) {
    const hex = data.slice(2);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }
  return data as Uint8Array;
}

export async function decryptToken(
  admin: ReturnType<typeof createClient>,
  ciphertext: Uint8Array | string,
): Promise<string> {
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  // Convert Uint8Array → \x hex string for RPC
  let payload: string;
  if (typeof ciphertext === "string") {
    payload = ciphertext;
  } else {
    let hex = "\\x";
    for (let i = 0; i < ciphertext.length; i++) {
      hex += ciphertext[i].toString(16).padStart(2, "0");
    }
    payload = hex;
  }
  const { data, error } = await admin.rpc("decrypt_secret", {
    ciphertext: payload,
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
