// Minimalistisk IMAP-klient över TLS för Supabase Edge Functions.
// Stöder bara det vi behöver: LOGIN, SELECT INBOX, UID SEARCH, UID FETCH (BODY.PEEK + UID),
// LOGOUT. Använder Deno.connectTls direkt — inga Node-polyfills.
//
// Protokoll: RFC 3501. Vi använder "tagged" kommandon (A001, A002, ...) och
// läser svar tills vi ser "<tag> OK|NO|BAD <text>".

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean; // true = implicit TLS (port 993), false = plain (vi stöder ej STARTTLS i v1)
  username: string;
  password: string;
}

export interface ImapMessage {
  uid: number;
  raw: Uint8Array;
}

export class ImapError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "ImapError";
  }
}

export class ImapClient {
  private conn: Deno.TlsConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private tagCounter = 0;
  private buffer = new Uint8Array(0);
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  constructor(private cfg: ImapConfig) {}

  async connect(timeoutMs = 15000): Promise<void> {
    if (!this.cfg.secure) {
      // STARTTLS not implemented; refuse plain to avoid leaking creds
      throw new ImapError("Plain IMAP not supported; require TLS (port 993)");
    }
    const conn = await withTimeout(
      Deno.connectTls({ hostname: this.cfg.host, port: this.cfg.port }),
      timeoutMs,
      `connect ${this.cfg.host}:${this.cfg.port}`,
    );
    this.conn = conn;
    this.reader = conn.readable.getReader();
    this.writer = conn.writable.getWriter();
    // Read greeting (untagged * OK ...)
    const greeting = await this.readLine(timeoutMs);
    if (!greeting.startsWith("* OK")) {
      throw new ImapError(`Unexpected greeting: ${greeting.slice(0, 200)}`);
    }
  }

  async login(timeoutMs = 15000): Promise<void> {
    // Använd LOGIN-kommandot. Lösenord i quoted string — escapa " och \.
    const u = quote(this.cfg.username);
    const p = quote(this.cfg.password);
    const res = await this.command(`LOGIN ${u} ${p}`, timeoutMs);
    if (!res.ok) throw new ImapError(`LOGIN failed: ${res.text}`, "auth");
  }

  /** SELECT INBOX. Returnerar UIDVALIDITY + UIDNEXT om vi kan parsa dem. */
  async selectInbox(timeoutMs = 15000): Promise<{ uidValidity: number | null; uidNext: number | null; exists: number }> {
    const res = await this.command("SELECT INBOX", timeoutMs);
    if (!res.ok) throw new ImapError(`SELECT failed: ${res.text}`);
    let uidValidity: number | null = null;
    let uidNext: number | null = null;
    let exists = 0;
    for (const line of res.untagged) {
      const v = line.match(/UIDVALIDITY\s+(\d+)/i);
      if (v) uidValidity = Number(v[1]);
      const n = line.match(/UIDNEXT\s+(\d+)/i);
      if (n) uidNext = Number(n[1]);
      const e = line.match(/^\*\s+(\d+)\s+EXISTS/i);
      if (e) exists = Number(e[1]);
    }
    return { uidValidity, uidNext, exists };
  }

  /** UID SEARCH SINCE <date>. Returnerar lista UIDs. */
  async searchSince(sinceDate: Date, timeoutMs = 30000): Promise<number[]> {
    const d = formatImapDate(sinceDate);
    const res = await this.command(`UID SEARCH SINCE ${d}`, timeoutMs);
    if (!res.ok) throw new ImapError(`SEARCH failed: ${res.text}`);
    return extractUidsFromSearch(res.untagged);
  }

  /** UID SEARCH UID <minUid>:*. Returnerar lista UIDs. */
  async searchSinceUid(minUid: number, timeoutMs = 30000): Promise<number[]> {
    const res = await this.command(`UID SEARCH UID ${minUid}:*`, timeoutMs);
    if (!res.ok) throw new ImapError(`SEARCH failed: ${res.text}`);
    return extractUidsFromSearch(res.untagged).filter((u) => u >= minUid);
  }

  /** UID FETCH för ett enskilt meddelande. Returnerar rå RFC822 + UID. */
  async fetchRaw(uid: number, timeoutMs = 30000): Promise<ImapMessage | null> {
    // BODY.PEEK[] gör att meddelandet inte markeras som läst.
    const tag = this.nextTag();
    const cmd = `${tag} UID FETCH ${uid} (UID BODY.PEEK[])\r\n`;
    await this.writeLine(cmd, timeoutMs);

    const untagged: string[] = [];
    let raw: Uint8Array | null = null;
    let parsedUid: number | null = null;

    while (true) {
      const line = await this.readLine(timeoutMs);
      if (line.startsWith(`${tag} `)) {
        const rest = line.slice(tag.length + 1);
        if (!rest.startsWith("OK")) {
          throw new ImapError(`FETCH ${uid} failed: ${rest.slice(0, 200)}`);
        }
        break;
      }
      // Untagged response — kan vara start på FETCH med literal: "* <num> FETCH (UID 123 BODY[] {4567}"
      const litMatch = line.match(/\{(\d+)\}\s*$/);
      if (litMatch) {
        const litLen = Number(litMatch[1]);
        // Läs exakt litLen bytes från strömmen
        const body = await this.readExact(litLen, timeoutMs);
        raw = body;
        // Plocka UID från det vi just såg
        const uidMatch = line.match(/UID\s+(\d+)/i);
        if (uidMatch) parsedUid = Number(uidMatch[1]);
        // Konsumera resten av FETCH-svaret (en eller flera rader fram till ")")
        // — IMAP avslutar med ")" på sista raden innan tagged OK.
        // Vi läser rader tills vi ser en som matchar /^\)\s*$/ eller börjar med tag.
        // (Vissa servrar lägger ")" på samma rad som annat.)
        // Enklast: läs rader tills vi ser den taggade ok-raden (då breakar yttre loop).
        continue;
      }
      untagged.push(line);
    }

    if (!raw) return null;
    return { uid: parsedUid ?? uid, raw };
  }

  async logout(timeoutMs = 5000): Promise<void> {
    try {
      await this.command("LOGOUT", timeoutMs);
    } catch (_) {
      // ignore
    } finally {
      try { this.reader?.releaseLock(); } catch (_) { /* */ }
      try { this.writer?.releaseLock(); } catch (_) { /* */ }
      try { this.conn?.close(); } catch (_) { /* */ }
      this.conn = null;
      this.reader = null;
      this.writer = null;
    }
  }

  // -------- internals --------

  private nextTag(): string {
    this.tagCounter += 1;
    return `A${String(this.tagCounter).padStart(4, "0")}`;
  }

  private async command(cmd: string, timeoutMs: number): Promise<{ ok: boolean; text: string; untagged: string[] }> {
    const tag = this.nextTag();
    await this.writeLine(`${tag} ${cmd}\r\n`, timeoutMs);
    const untagged: string[] = [];
    while (true) {
      const line = await this.readLine(timeoutMs);
      if (line.startsWith(`${tag} `)) {
        const rest = line.slice(tag.length + 1);
        const ok = /^OK\b/i.test(rest);
        return { ok, text: rest, untagged };
      }
      untagged.push(line);
    }
  }

  private async writeLine(s: string, timeoutMs: number): Promise<void> {
    if (!this.writer) throw new ImapError("Not connected");
    await withTimeout(this.writer.write(this.encoder.encode(s)), timeoutMs, "write");
  }

  /** Läser en rad (CRLF-terminerad) från strömmen. Konsumerar CRLF. */
  private async readLine(timeoutMs: number): Promise<string> {
    while (true) {
      const idx = findCrlf(this.buffer);
      if (idx >= 0) {
        const line = this.decoder.decode(this.buffer.slice(0, idx));
        this.buffer = this.buffer.slice(idx + 2);
        return line;
      }
      await this.fillBuffer(timeoutMs);
    }
  }

  private async readExact(n: number, timeoutMs: number): Promise<Uint8Array> {
    while (this.buffer.length < n) {
      await this.fillBuffer(timeoutMs);
    }
    const out = this.buffer.slice(0, n);
    this.buffer = this.buffer.slice(n);
    return out;
  }

  private async fillBuffer(timeoutMs: number): Promise<void> {
    if (!this.reader) throw new ImapError("Not connected");
    const { value, done } = await withTimeout(this.reader.read(), timeoutMs, "read");
    if (done || !value) throw new ImapError("Connection closed");
    const next = new Uint8Array(this.buffer.length + value.length);
    next.set(this.buffer);
    next.set(value, this.buffer.length);
    this.buffer = next;
  }
}

// -------- helpers --------

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function findCrlf(buf: Uint8Array): number {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) return i;
  }
  return -1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatImapDate(d: Date): string {
  return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

function extractUidsFromSearch(lines: string[]): number[] {
  const uids = new Set<number>();
  for (const line of lines) {
    const m = line.match(/^\*\s+SEARCH\s+(.*)$/i);
    if (!m) continue;
    for (const tok of m[1].trim().split(/\s+/)) {
      const n = Number(tok);
      if (Number.isFinite(n) && n > 0) uids.add(n);
    }
  }
  return Array.from(uids).sort((a, b) => a - b);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new ImapError(`IMAP timeout: ${label} (${ms}ms)`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
