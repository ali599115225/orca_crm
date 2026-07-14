// lib/email.ts
import "server-only";

import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

import { Resend } from "resend";

import { decryptText } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const EMAIL_PROVIDER_NOT_CONFIGURED = "EMAIL_PROVIDER_NOT_CONFIGURED";
export const EMAIL_PROVIDER_INVALID = "EMAIL_PROVIDER_INVALID";

export type TenantEmailProviderId = "RESEND" | "SMTP";

type JsonRecord = Record<string, unknown>;

type ResendEmailProviderSecret = {
  provider: "RESEND";
  fromEmail: string;
  apiKey: string;
};

type SmtpSecurity = "TLS" | "STARTTLS";

type SmtpEmailProviderSecret = {
  provider: "SMTP";
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
};

type TenantEmailProviderSecret =
  | ResendEmailProviderSecret
  | SmtpEmailProviderSecret;

export type TenantEmailProviderSummary = {
  configured: boolean;
  provider: TenantEmailProviderId | null;
  fromEmail: string | null;
  reason:
    | null
    | typeof EMAIL_PROVIDER_NOT_CONFIGURED
    | typeof EMAIL_PROVIDER_INVALID;
};

type EmailProviderConnectionRecord = {
  provider: string;
  status: string;
  encryptedCredentials: string;
};

type SmtpResponse = {
  code: number;
  lines: string[];
};

type SocketLike = net.Socket | tls.TLSSocket;

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const SMTP_TIMEOUT_MS = 15_000;

const SMTP_HOST_PATTERN =
  /^(?=.{1,253}\.?$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.?$/i;

type ResolvedSmtpEndpoint = {
  address: string;
  family: 4 | 6;
  servername?: string;
};

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number(part));
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = octets;
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  ) {
    return false;
  }

  return true;
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  ) {
    return false;
  }

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(normalized);
  if (mapped) return isPublicIpv4(mapped[1]);

  return true;
}

function isPublicIpAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

async function resolvePublicSmtpEndpoint(
  host: string,
): Promise<ResolvedSmtpEndpoint> {
  const cleanHost = host.trim().replace(/\.$/, "");
  const directFamily = net.isIP(cleanHost);

  if (directFamily) {
    if (!isPublicIpAddress(cleanHost)) {
      throw new Error("SMTP_PRIVATE_HOST_BLOCKED");
    }

    return {
      address: cleanHost,
      family: directFamily as 4 | 6,
    };
  }

  if (!SMTP_HOST_PATTERN.test(cleanHost)) {
    throw new Error("SMTP_HOST_INVALID");
  }

  const records = await lookup(cleanHost, {
    all: true,
    verbatim: true,
  });

  if (
    records.length === 0 ||
    records.some((record) => !isPublicIpAddress(record.address))
  ) {
    throw new Error("SMTP_PRIVATE_HOST_BLOCKED");
  }

  const selected = records[0];
  return {
    address: selected.address,
    family: selected.family as 4 | 6,
    servername: cleanHost,
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean : null;
}

function safeHeaderValue(value: unknown): string | null {
  const clean = nonEmptyString(value);
  if (!clean || /[\r\n]/.test(clean)) return null;
  return clean;
}

function validEmail(value: unknown): string | null {
  const clean = safeHeaderValue(value);
  if (!clean || !EMAIL_PATTERN.test(clean)) return null;
  return clean;
}

function parsePort(value: unknown): number | null {
  const port =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value || "").trim(), 10);

  return Number.isInteger(port) && port > 0 && port <= 65_535
    ? port
    : null;
}

function parseEncryptedCredentials(value: string): JsonRecord | null {
  try {
    const decrypted = decryptText(value);
    if (!decrypted) return null;

    const parsed: unknown = JSON.parse(decrypted);
    if (!isRecord(parsed)) return null;

    const nested = parsed.credentials;
    return isRecord(nested) ? nested : parsed;
  } catch {
    return null;
  }
}

function parseProviderSecret(
  connection: EmailProviderConnectionRecord,
): TenantEmailProviderSecret | null {
  const credentials = parseEncryptedCredentials(
    connection.encryptedCredentials,
  );

  if (!credentials) return null;

  if (connection.provider === "RESEND") {
    const apiKey = nonEmptyString(credentials.apiKey);
    const fromEmail = validEmail(credentials.fromEmail);

    if (!apiKey || !fromEmail) return null;

    return {
      provider: "RESEND",
      apiKey,
      fromEmail,
    };
  }

  if (connection.provider === "SMTP") {
    const host = safeHeaderValue(credentials.host);
    const port = parsePort(credentials.port);
    const username = safeHeaderValue(credentials.username);
    const password = nonEmptyString(credentials.password);
    const fromEmail = validEmail(credentials.fromEmail);
    const fromName = safeHeaderValue(credentials.fromName);
    const replyTo = credentials.replyTo
      ? validEmail(credentials.replyTo)
      : null;
    const securityValue = String(
      credentials.security || "",
    ).toUpperCase();
    const security: SmtpSecurity | null =
      securityValue === "TLS" || securityValue === "STARTTLS"
        ? securityValue
        : null;

    if (
      !host ||
      !port ||
      !security ||
      !username ||
      !password ||
      !fromEmail
    ) {
      return null;
    }

    return {
      provider: "SMTP",
      host,
      port,
      security,
      username,
      password,
      fromEmail,
      fromName,
      replyTo,
    };
  }

  return null;
}

async function resolveTenantEmailProvider(
  tenantId: string,
): Promise<
  | { ok: true; value: TenantEmailProviderSecret }
  | {
      ok: false;
      reason:
        | typeof EMAIL_PROVIDER_NOT_CONFIGURED
        | typeof EMAIL_PROVIDER_INVALID;
    }
> {
  const connections = await prisma.revenueProviderConnection.findMany({
    where: {
      tenantId,
      provider: { in: ["SMTP", "RESEND"] },
      status: "CONNECTED",
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      provider: true,
      status: true,
      encryptedCredentials: true,
    },
  });

  if (connections.length === 0) {
    return { ok: false, reason: EMAIL_PROVIDER_NOT_CONFIGURED };
  }

  for (const connection of connections) {
    const parsed = parseProviderSecret(connection);
    if (parsed) {
      return { ok: true, value: parsed };
    }
  }

  return { ok: false, reason: EMAIL_PROVIDER_INVALID };
}

export async function getTenantEmailProviderSummary(
  tenantId: string,
): Promise<TenantEmailProviderSummary> {
  const result = await resolveTenantEmailProvider(tenantId);

  if (!result.ok) {
    return {
      configured: false,
      provider: null,
      fromEmail: null,
      reason: result.reason,
    };
  }

  return {
    configured: true,
    provider: result.value.provider,
    fromEmail: result.value.fromEmail,
    reason: null,
  };
}

/**
 * تنبيهات المنصة الداخلية لا تستخدم اشتراكًا عامًا في مزود بريد.
 * إلى أن يُعتمد مسار تنبيهات تشغيلي مستقل، تُكتب في السجل فقط.
 */
export async function sendAdminEmailAlert(
  subject: string,
  htmlContent: string,
) {
  console.info("[ORCA_ADMIN_ALERT]", {
    subject,
    htmlContent,
  });
}

export interface SendEmailOptions {
  tenantId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider?: TenantEmailProviderId;
  fromEmail?: string;
  providerMessageId?: string;
  code?:
    | typeof EMAIL_PROVIDER_NOT_CONFIGURED
    | typeof EMAIL_PROVIDER_INVALID;
  error?: string;
}

class SmtpResponseReader {
  private buffer = "";
  private currentCode: number | null = null;
  private currentLines: string[] = [];
  private queued: SmtpResponse[] = [];
  private waiters: Array<{
    resolve: (value: SmtpResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private disposed = false;

  private readonly onData = (chunk: Buffer | string) => {
    this.buffer += chunk.toString();

    while (true) {
      const lineEnd = this.buffer.indexOf("\n");
      if (lineEnd < 0) return;

      const line = this.buffer
        .slice(0, lineEnd)
        .replace(/\r$/, "");
      this.buffer = this.buffer.slice(lineEnd + 1);
      this.consumeLine(line);
    }
  };

  private readonly onError = (error: Error) => {
    this.fail(error);
  };

  private readonly onClose = () => {
    if (!this.disposed) {
      this.fail(new Error("SMTP_CONNECTION_CLOSED"));
    }
  };

  constructor(private readonly socket: SocketLike) {
    socket.on("data", this.onData);
    socket.on("error", this.onError);
    socket.on("close", this.onClose);
  }

  read(): Promise<SmtpResponse> {
    const ready = this.queued.shift();
    if (ready) return Promise.resolve(ready);

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  dispose() {
    this.disposed = true;
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("close", this.onClose);
  }

  private consumeLine(line: string) {
    const match = /^(\d{3})([ -])(.*)$/.exec(line);

    if (!match) {
      if (this.currentCode !== null) {
        this.currentLines.push(line);
      }
      return;
    }

    const code = Number(match[1]);
    const separator = match[2];
    const message = match[3];

    if (this.currentCode === null) {
      this.currentCode = code;
      this.currentLines = [message];
    } else {
      this.currentLines.push(message);
    }

    if (separator === " ") {
      const response = {
        code: this.currentCode,
        lines: [...this.currentLines],
      };

      this.currentCode = null;
      this.currentLines = [];
      this.deliver(response);
    }
  }

  private deliver(response: SmtpResponse) {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.resolve(response);
      return;
    }

    this.queued.push(response);
  }

  private fail(error: Error) {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      waiter.reject(error);
    }
  }
}

function waitForSocket(
  socket: SocketLike,
  event: "connect" | "secureConnect",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off(event, onReady);
      socket.off("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once(event, onReady);
    socket.once("error", onError);
  });
}

function configureSocketTimeout(socket: SocketLike) {
  socket.setTimeout(SMTP_TIMEOUT_MS, () => {
    socket.destroy(new Error("SMTP_TIMEOUT"));
  });
}

async function writeSocket(
  socket: SocketLike,
  payload: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once("error", onError);
    socket.write(payload, () => {
      cleanup();
      resolve();
    });
  });
}

function assertSmtpCode(
  response: SmtpResponse,
  expected: number | number[],
  operation: string,
) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(response.code)) {
    throw new Error(`${operation}_${response.code}`);
  }
}

async function command(
  socket: SocketLike,
  reader: SmtpResponseReader,
  value: string,
  expected?: number | number[],
): Promise<SmtpResponse> {
  await writeSocket(socket, `${value}\r\n`);
  const response = await reader.read();

  if (expected !== undefined) {
    assertSmtpCode(response, expected, "SMTP_COMMAND_FAILED");
  }

  return response;
}

async function authenticateSmtp(
  socket: SocketLike,
  reader: SmtpResponseReader,
  capabilities: string,
  username: string,
  password: string,
) {
  const normalized = capabilities.toUpperCase();

  if (/\bAUTH(?:=|\s)[^\r\n]*\bPLAIN\b/.test(normalized)) {
    const token = Buffer.from(`\u0000${username}\u0000${password}`).toString(
      "base64",
    );
    const response = await command(socket, reader, `AUTH PLAIN ${token}`);

    if (response.code === 334) {
      const continuation = await command(socket, reader, token, 235);
      assertSmtpCode(continuation, 235, "SMTP_AUTH_FAILED");
      return;
    }

    assertSmtpCode(response, 235, "SMTP_AUTH_FAILED");
    return;
  }

  if (/\bAUTH(?:=|\s)[^\r\n]*\bLOGIN\b/.test(normalized)) {
    await command(socket, reader, "AUTH LOGIN", 334);
    await command(
      socket,
      reader,
      Buffer.from(username).toString("base64"),
      334,
    );
    await command(
      socket,
      reader,
      Buffer.from(password).toString("base64"),
      235,
    );
    return;
  }

  throw new Error("SMTP_AUTH_METHOD_UNSUPPORTED");
}

async function openAuthenticatedSmtp(
  secret: SmtpEmailProviderSecret,
): Promise<{
  socket: SocketLike;
  reader: SmtpResponseReader;
}> {
  const endpoint = await resolvePublicSmtpEndpoint(secret.host);
  let socket: SocketLike | undefined;
  let reader: SmtpResponseReader | undefined;

  try {
    if (secret.security === "TLS") {
      const secureSocket = tls.connect({
        host: endpoint.address,
        port: secret.port,
        ...(endpoint.servername
          ? { servername: endpoint.servername }
          : {}),
        rejectUnauthorized: true,
      });

      socket = secureSocket;
      reader = new SmtpResponseReader(secureSocket);
      configureSocketTimeout(secureSocket);
      await waitForSocket(secureSocket, "secureConnect");

      if (!secureSocket.authorized) {
        throw new Error("SMTP_TLS_NOT_AUTHORIZED");
      }

      const greeting = await reader.read();
      assertSmtpCode(greeting, 220, "SMTP_GREETING_FAILED");
    } else {
      const plainSocket = net.connect({
        host: endpoint.address,
        family: endpoint.family,
        port: secret.port,
      });

      socket = plainSocket;
      reader = new SmtpResponseReader(plainSocket);
      configureSocketTimeout(plainSocket);
      await waitForSocket(plainSocket, "connect");

      const greeting = await reader.read();
      assertSmtpCode(greeting, 220, "SMTP_GREETING_FAILED");

      const initialEhlo = await command(
        plainSocket,
        reader,
        "EHLO orca.invalid",
        250,
      );
      const initialCapabilities = initialEhlo.lines.join("\n").toUpperCase();

      if (!initialCapabilities.includes("STARTTLS")) {
        throw new Error("SMTP_STARTTLS_UNAVAILABLE");
      }

      await command(plainSocket, reader, "STARTTLS", 220);
      reader.dispose();
      plainSocket.setTimeout(0);

      const secureSocket = tls.connect({
        socket: plainSocket,
        ...(endpoint.servername
          ? { servername: endpoint.servername }
          : {}),
        rejectUnauthorized: true,
      });

      socket = secureSocket;
      reader = new SmtpResponseReader(secureSocket);
      configureSocketTimeout(secureSocket);
      await waitForSocket(secureSocket, "secureConnect");

      if (!secureSocket.authorized) {
        throw new Error("SMTP_TLS_NOT_AUTHORIZED");
      }
    }

    if (!socket || !reader) {
      throw new Error("SMTP_CONNECTION_NOT_READY");
    }

    const ehlo = await command(socket, reader, "EHLO orca.invalid", 250);
    await authenticateSmtp(
      socket,
      reader,
      ehlo.lines.join("\n"),
      secret.username,
      secret.password,
    );

    return { socket, reader };
  } catch (error) {
    reader?.dispose();
    socket?.destroy();
    throw error;
  }
}

async function closeSmtp(
  socket: SocketLike,
  reader: SmtpResponseReader,
) {
  try {
    await command(socket, reader, "QUIT", [221, 250]);
  } catch {
    // The message/test result has already been determined.
  } finally {
    reader.dispose();
    socket.end();
    socket.destroy();
  }
}

function splitAddressList(value?: string): string[] {
  if (!value) return [];

  const addresses = value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (addresses.length === 0 || addresses.some((item) => !validEmail(item))) {
    throw new Error("EMAIL_ADDRESS_INVALID");
  }

  return [...new Set(addresses)];
}

function encodeHeader(value: string): string {
  const clean = safeHeaderValue(value);
  if (!clean) throw new Error("EMAIL_HEADER_INVALID");

  if (/^[\x20-\x7E]+$/.test(clean)) {
    return clean;
  }

  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function wrapBase64(value: string): string {
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") || "";
}

function buildMimeMessage(
  secret: SmtpEmailProviderSecret,
  options: SendEmailOptions,
  recipients: {
    to: string[];
    cc: string[];
  },
): { message: string; messageId: string } {
  const messageId = `<${randomUUID()}@${secret.fromEmail.split("@")[1]}>`;
  const fromHeader = secret.fromName
    ? `${encodeHeader(secret.fromName)} <${secret.fromEmail}>`
    : secret.fromEmail;
  const subject = encodeHeader(options.subject);
  const text = options.textBody || "";
  const html = options.htmlBody || "";
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `From: ${fromHeader}`,
    `To: ${recipients.to.join(", ")}`,
    ...(recipients.cc.length > 0
      ? [`Cc: ${recipients.cc.join(", ")}`]
      : []),
    ...(secret.replyTo ? [`Reply-To: ${secret.replyTo}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
  ];

  let body: string;

  if (text && html) {
    const boundary = `orca-${randomUUID()}`;
    headers.push(
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    );
    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(text),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(html),
      `--${boundary}--`,
    ].join("\r\n");
  } else if (html) {
    headers.push(
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
    );
    body = wrapBase64(html);
  } else {
    headers.push(
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
    );
    body = wrapBase64(text);
  }

  return {
    message: `${headers.join("\r\n")}\r\n\r\n${body}`,
    messageId,
  };
}

function normalizeSmtpPayload(value: string): string {
  return value
    .replace(/\r?\n/g, "\r\n")
    .replace(/(^|\r\n)\./g, "$1..");
}

function publicSmtpError(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toUpperCase() : "";

  if (message.includes("PRIVATE_HOST")) return "SMTP_HOST_NOT_ALLOWED";
  if (message.includes("HOST_INVALID")) return "SMTP_HOST_INVALID";
  if (message.includes("AUTH")) return "SMTP_AUTH_FAILED";
  if (message.includes("TLS") || message.includes("CERT")) {
    return "SMTP_TLS_FAILED";
  }
  if (message.includes("TIMEOUT")) return "SMTP_TIMEOUT";
  if (message.includes("ADDRESS")) return "EMAIL_ADDRESS_INVALID";
  return "SMTP_CONNECTION_FAILED";
}

async function testSmtpSecret(
  secret: SmtpEmailProviderSecret,
): Promise<{ success: boolean; error?: string }> {
  let session:
    | {
        socket: SocketLike;
        reader: SmtpResponseReader;
      }
    | undefined;

  try {
    session = await openAuthenticatedSmtp(secret);
    await command(session.socket, session.reader, "NOOP", 250);
    await closeSmtp(session.socket, session.reader);
    return { success: true };
  } catch (error) {
    if (session) {
      session.reader.dispose();
      session.socket.destroy();
    }
    console.error("[Email SMTP] Connection test failed:", error);
    return {
      success: false,
      error: publicSmtpError(error),
    };
  }
}

async function sendWithSmtp(
  secret: SmtpEmailProviderSecret,
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  let session:
    | {
        socket: SocketLike;
        reader: SmtpResponseReader;
      }
    | undefined;

  try {
    const to = splitAddressList(options.to);
    const cc = splitAddressList(options.cc);
    const bcc = splitAddressList(options.bcc);
    const recipients = [...new Set([...to, ...cc, ...bcc])];

    if (recipients.length === 0) {
      return {
        success: false,
        provider: "SMTP",
        fromEmail: secret.fromEmail,
        error: "EMAIL_ADDRESS_INVALID",
      };
    }

    session = await openAuthenticatedSmtp(secret);
    await command(
      session.socket,
      session.reader,
      `MAIL FROM:<${secret.fromEmail}>`,
      250,
    );

    for (const recipient of recipients) {
      await command(
        session.socket,
        session.reader,
        `RCPT TO:<${recipient}>`,
        [250, 251],
      );
    }

    await command(session.socket, session.reader, "DATA", 354);

    const mime = buildMimeMessage(secret, options, { to, cc });
    await writeSocket(
      session.socket,
      `${normalizeSmtpPayload(mime.message)}\r\n.\r\n`,
    );
    const accepted = await session.reader.read();
    assertSmtpCode(accepted, 250, "SMTP_DATA_REJECTED");

    await closeSmtp(session.socket, session.reader);

    return {
      success: true,
      provider: "SMTP",
      fromEmail: secret.fromEmail,
      providerMessageId: mime.messageId,
    };
  } catch (error) {
    if (session) {
      session.reader.dispose();
      session.socket.destroy();
    }
    console.error("[Email SMTP] Send failed:", error);
    return {
      success: false,
      provider: "SMTP",
      fromEmail: secret.fromEmail,
      error: publicSmtpError(error),
    };
  }
}

export async function testEmailProviderConnection(input: {
  provider: TenantEmailProviderId;
  encryptedCredentials: string;
}): Promise<{ success: boolean; error?: string }> {
  const secret = parseProviderSecret({
    provider: input.provider,
    status: "PENDING",
    encryptedCredentials: input.encryptedCredentials,
  });

  if (!secret) {
    return { success: false, error: EMAIL_PROVIDER_INVALID };
  }

  if (secret.provider === "SMTP") {
    return testSmtpSecret(secret);
  }

  return {
    success: false,
    error: "EMAIL_PROVIDER_TEST_UNSUPPORTED",
  };
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  try {
    if (!options.to || !options.subject) {
      return {
        success: false,
        error: "الحقول المطلوبة: to, subject",
      };
    }

    const provider = await resolveTenantEmailProvider(options.tenantId);

    if (!provider.ok) {
      return {
        success: false,
        code: provider.reason,
      };
    }

    if (provider.value.provider === "SMTP") {
      return sendWithSmtp(provider.value, options);
    }

    const resend = new Resend(provider.value.apiKey);
    const cc = splitAddressList(options.cc);
    const bcc = splitAddressList(options.bcc);
    const sharedPayload = {
      from: provider.value.fromEmail,
      to: splitAddressList(options.to),
      subject: options.subject,
      ...(cc.length > 0 ? { cc } : {}),
      ...(bcc.length > 0 ? { bcc } : {}),
    };

    const result = options.htmlBody
      ? await resend.emails.send({
          ...sharedPayload,
          html: options.htmlBody,
          ...(options.textBody ? { text: options.textBody } : {}),
        })
      : await resend.emails.send({
          ...sharedPayload,
          text: options.textBody || "",
        });

    if (result.error) {
      return {
        success: false,
        provider: provider.value.provider,
        fromEmail: provider.value.fromEmail,
        error: result.error.message || "فشل إرسال البريد",
      };
    }

    return {
      success: true,
      provider: provider.value.provider,
      fromEmail: provider.value.fromEmail,
      providerMessageId: result.data?.id,
    };
  } catch (error: unknown) {
    console.error("[Email] Send error:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "خطأ غير متوقع في إرسال البريد",
    };
  }
}
