/**
 * Minimal SMTP client.
 *
 * We used to rely on denomailer@1.6.0, but it builds the message headers
 * itself and does it incorrectly:
 *  - Subject/From are "encoded" with a quoted-printable routine that does not
 *    encode spaces and wraps lines in the middle of the encoded word, so mail
 *    clients cannot decode them (`=?utf-8?Q?[TEST] Uppf=c3=b6ljning ...` with
 *    the rest of the word on the next line).
 *  - The threading header is written as `InReplyTo:` instead of `In-Reply-To:`.
 *
 * This client takes a fully built RFC 5322 message (see buildRfc2822) and only
 * handles the transport: EHLO, STARTTLS/implicit TLS, AUTH, MAIL/RCPT/DATA.
 */

export interface SmtpConfig {
  hostname: string;
  port: number;
  /** true = implicit TLS (usually port 465), false = plain + STARTTLS (587/25) */
  secure: boolean;
  username: string;
  password: string;
  timeoutMs?: number;
}

export class SmtpError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(`SMTP ${code}: ${message}`);
    this.code = code;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class Connection {
  #conn: Deno.Conn;
  #buf = "";
  #timeoutMs: number;

  constructor(conn: Deno.Conn, timeoutMs: number) {
    this.#conn = conn;
    this.#timeoutMs = timeoutMs;
  }

  get raw(): Deno.Conn {
    return this.#conn;
  }

  replace(conn: Deno.Conn) {
    this.#conn = conn;
    this.#buf = "";
  }

  async write(s: string) {
    const bytes = encoder.encode(s);
    let off = 0;
    while (off < bytes.length) {
      off += await this.#conn.write(bytes.subarray(off));
    }
  }

  /** Reads one full SMTP reply (handles multi-line 250-... responses). */
  async readReply(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    for (;;) {
      const line = await this.#readLine();
      lines.push(line);
      // Final line looks like "250 OK", continuation lines "250-OK"
      if (/^\d{3} /.test(line) || line.length < 4) break;
    }
    const last = lines[lines.length - 1] ?? "";
    const code = parseInt(last.slice(0, 3), 10);
    return { code: Number.isNaN(code) ? 0 : code, text: lines.join("\n") };
  }

  async #readLine(): Promise<string> {
    for (;;) {
      const idx = this.#buf.indexOf("\r\n");
      if (idx >= 0) {
        const line = this.#buf.slice(0, idx);
        this.#buf = this.#buf.slice(idx + 2);
        return line;
      }
      const chunk = new Uint8Array(4096);
      const n = await this.#withTimeout(this.#conn.read(chunk));
      if (n === null) {
        const rest = this.#buf;
        this.#buf = "";
        if (!rest) throw new Error("SMTP connection closed unexpectedly");
        return rest;
      }
      this.#buf += decoder.decode(chunk.subarray(0, n));
    }
  }

  #withTimeout<T>(p: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("SMTP timeout while waiting for server")),
        this.#timeoutMs,
      );
      p.then((v) => {
        clearTimeout(t);
        resolve(v);
      }).catch((e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  close() {
    try {
      this.#conn.close();
    } catch { /* noop */ }
  }
}

async function cmd(
  conn: Connection,
  command: string,
  expect: number[],
): Promise<{ code: number; text: string }> {
  await conn.write(command + "\r\n");
  const reply = await conn.readReply();
  if (!expect.includes(reply.code)) {
    throw new SmtpError(reply.code, reply.text);
  }
  return reply;
}

function dotStuff(message: string): string {
  // Normalize to CRLF and escape leading dots (RFC 5321 transparency)
  const normalized = message.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  return normalized.replace(/^\./gm, "..");
}

function b64(s: string): string {
  const bytes = encoder.encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Sends a fully built RFC 5322 message over SMTP.
 *
 * @param envelopeFrom bare address used in MAIL FROM
 * @param envelopeTo bare address used in RCPT TO
 * @param message complete message (headers + body)
 */
export async function sendRawMail(
  cfg: SmtpConfig,
  envelopeFrom: string,
  envelopeTo: string,
  message: string,
): Promise<void> {
  const timeoutMs = cfg.timeoutMs ?? 30_000;
  const tcp = cfg.secure
    ? await Deno.connectTls({ hostname: cfg.hostname, port: cfg.port })
    : await Deno.connect({ hostname: cfg.hostname, port: cfg.port });

  const conn = new Connection(tcp, timeoutMs);
  try {
    const greeting = await conn.readReply();
    if (greeting.code !== 220) {
      throw new SmtpError(greeting.code, greeting.text);
    }

    const ehloName = "maillead.ai";
    let ehlo = await cmd(conn, `EHLO ${ehloName}`, [250]);

    if (!cfg.secure && /STARTTLS/i.test(ehlo.text)) {
      await cmd(conn, "STARTTLS", [220]);
      const tls = await Deno.startTls(conn.raw as Deno.TcpConn, {
        hostname: cfg.hostname,
      });
      conn.replace(tls);
      ehlo = await cmd(conn, `EHLO ${ehloName}`, [250]);
    }

    const supportsPlain = /AUTH[ -=][^\n]*PLAIN/i.test(ehlo.text);
    const supportsLogin = /AUTH[ -=][^\n]*LOGIN/i.test(ehlo.text);

    if (supportsPlain) {
      await cmd(
        conn,
        `AUTH PLAIN ${b64(`\u0000${cfg.username}\u0000${cfg.password}`)}`,
        [235],
      );
    } else if (supportsLogin) {
      await cmd(conn, "AUTH LOGIN", [334]);
      await cmd(conn, b64(cfg.username), [334]);
      await cmd(conn, b64(cfg.password), [235]);
    } else {
      // Some servers advertise nothing useful; LOGIN is the safest attempt.
      await cmd(conn, "AUTH LOGIN", [334]);
      await cmd(conn, b64(cfg.username), [334]);
      await cmd(conn, b64(cfg.password), [235]);
    }

    await cmd(conn, `MAIL FROM:<${envelopeFrom}>`, [250]);
    await cmd(conn, `RCPT TO:<${envelopeTo}>`, [250, 251]);
    await cmd(conn, "DATA", [354]);
    await conn.write(dotStuff(message) + "\r\n.\r\n");
    const sent = await conn.readReply();
    if (sent.code !== 250) throw new SmtpError(sent.code, sent.text);

    try {
      await cmd(conn, "QUIT", [221, 250]);
    } catch { /* server may just close */ }
  } finally {
    conn.close();
  }
}

/** Vilken fas i SMTP-dialogen som fallerade — hjälper till att skilja
 * "servern spärrar redan anslutningen" från "inloggningen nekades". */
export type SmtpStage = "connect" | "greeting" | "ehlo" | "starttls" | "auth" | "quit";

/** Connect + EHLO + AUTH only, used by the connection test. */
export async function verifySmtpLogin(cfg: SmtpConfig): Promise<void> {
  const timeoutMs = cfg.timeoutMs ?? 20_000;
  let stage: SmtpStage = "connect";
  const tag = (e: unknown) => {
    if (e && typeof e === "object" && !(e as any).stage) (e as any).stage = stage;
    return e;
  };

  let tcp: Deno.Conn;
  try {
    tcp = cfg.secure
      ? await Deno.connectTls({ hostname: cfg.hostname, port: cfg.port })
      : await Deno.connect({ hostname: cfg.hostname, port: cfg.port });
  } catch (e) {
    throw tag(e);
  }

  const conn = new Connection(tcp, timeoutMs);
  try {
    stage = "greeting";
    const greeting = await conn.readReply();
    if (greeting.code !== 220) throw new SmtpError(greeting.code, greeting.text);
    stage = "ehlo";
    let ehlo = await cmd(conn, "EHLO maillead.ai", [250]);
    if (!cfg.secure && /STARTTLS/i.test(ehlo.text)) {
      stage = "starttls";
      await cmd(conn, "STARTTLS", [220]);
      const tls = await Deno.startTls(conn.raw as Deno.TcpConn, {
        hostname: cfg.hostname,
      });
      conn.replace(tls);
      stage = "ehlo";
      ehlo = await cmd(conn, "EHLO maillead.ai", [250]);
    }
    stage = "auth";
    if (/AUTH[ -=][^\n]*PLAIN/i.test(ehlo.text)) {
      await cmd(
        conn,
        `AUTH PLAIN ${b64(`\u0000${cfg.username}\u0000${cfg.password}`)}`,
        [235],
      );
    } else {
      await cmd(conn, "AUTH LOGIN", [334]);
      await cmd(conn, b64(cfg.username), [334]);
      await cmd(conn, b64(cfg.password), [235]);
    }
    stage = "quit";
    try {
      await cmd(conn, "QUIT", [221, 250]);
    } catch { /* noop */ }
  } catch (e) {
    throw tag(e);
  } finally {
    conn.close();
  }
}

