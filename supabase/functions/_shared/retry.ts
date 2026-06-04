// Shared retry helper for outbound HTTP calls to email providers.
// Retries only transient failures (network, 408/429/5xx). Permanent
// failures (4xx other than 408/429) bubble up immediately so the caller
// can mark them failed without burning retries.

export class TransientError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Transient HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "TransientError";
    this.status = status;
    this.body = body;
  }
}

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isTransientStatus(status: number): boolean {
  return TRANSIENT_HTTP.has(status);
}

export function isTransientSmtpCode(code: number | undefined): boolean {
  // 4xx = transient per RFC 5321
  return typeof code === "number" && code >= 400 && code < 500;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface RetryOptions {
  maxAttempts?: number;       // default 3
  baseDelayMs?: number;       // default 1000
  onAttempt?: (attempt: number, err: unknown) => void;
}

/**
 * Run `fn` with exponential backoff + jitter on transient errors.
 * `fn` should throw `TransientError` (or a generic network Error) when the
 * call may succeed if retried. Throw any other Error for permanent failures.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const transient = e instanceof TransientError || isLikelyNetworkError(e);
      opts.onAttempt?.(attempt, e);
      if (!transient || attempt === maxAttempts) throw e;
      const backoff = baseDelayMs * Math.pow(3, attempt - 1); // 1s, 3s, 9s
      const jitter = Math.floor(Math.random() * Math.min(500, backoff / 2));
      await sleep(backoff + jitter);
    }
  }
  throw lastErr;
}

function isLikelyNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("connection") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket")
  );
}
