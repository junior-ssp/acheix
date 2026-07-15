import { getFirebaseAdminMessaging } from "@/lib/firebase-admin";
import net from "node:net";
import tls from "node:tls";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

type NoticeOptions = {
  linkLabel?: string;
  linkUrl?: string;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
  contactLeadId?: string;
  suppressPush?: boolean;
};

type NoticeChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP";

type NoticeUser = {
  id: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  notificationChannel?: NoticeChannel;
  notificationChannels?: NoticeChannel[];
};

export class EmailDeliveryError extends Error {
  readonly status = 503;

  constructor(message = "O serviço de e-mail está temporariamente indisponível. Tente novamente mais tarde.") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export function assertEmailDeliveryConfigured() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new EmailDeliveryError();
  }
}

export async function createNotification(userId: string, title: string, message: string, options: NoticeOptions = {}) {
  const { suppressPush: _suppressPush, ...notificationOptions } = options;
  const { data, error } = await db()
    .from("Notification")
    .insert({ id: newDbId(), userId, title, message, ...notificationOptions })
    .select("*")
    .single();
  throwDbError(error);
  return data;
}

export async function deliverUserNotice(user: NoticeUser, title: string, message: string, options: NoticeOptions = {}) {
  const channels = user.notificationChannels?.length ? user.notificationChannels : [user.notificationChannel ?? "IN_APP"];
  const uniqueChannels = normalizeNoticeChannels(channels);

  if (uniqueChannels.includes("IN_APP")) await createNotification(user.id, title, message, options);
  if (uniqueChannels.includes("EMAIL")) await sendEmail(user.email, title, message);
  if (uniqueChannels.includes("SMS") && user.phone) await sendSms(user.phone, message);
  if (uniqueChannels.includes("WHATSAPP") && user.whatsapp) await sendWhatsapp(user.whatsapp, message);
  if (uniqueChannels.includes("PUSH") && !options.suppressPush) await queuePush(user.id, title, message, options);
}

function normalizeNoticeChannels(channels: NoticeChannel[]) {
  return [...new Set([...channels, "IN_APP", "PUSH"])] as NoticeChannel[];
}

export async function sendEmail(to: string, subject: string, body: string) {
  try {
    assertEmailDeliveryConfigured();
  } catch (error) {
    await createAuditLog(null, "email.failed", { to, subject, reason: "smtp_not_configured" });
    throw error;
  }
  try {
    await sendSmtpEmail(to, subject, body);
    await createAuditLog(null, "email.sent", { to, subject });
  } catch (error) {
    await createAuditLog(null, "email.failed", { to, subject, error: error instanceof Error ? error.message : String(error) });
    throw error instanceof EmailDeliveryError ? error : new EmailDeliveryError();
  }
}

export async function verifySmtpConnection() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP não configurado");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465 || process.env.SMTP_SECURE === "true";
  let socket: net.Socket | tls.TLSSocket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  const reader = smtpReader(socket);
  const verification = async () => {
    await reader.expect([220]);
    await smtpCommand(socket, reader, `EHLO ${smtpDomain()}`, [250]);
    if (!secure) {
      await smtpCommand(socket, reader, "STARTTLS", [220]);
      socket = tls.connect({ socket, servername: host });
      reader.attach(socket);
      await smtpCommand(socket, reader, `EHLO ${smtpDomain()}`, [250]);
    }
    await smtpCommand(socket, reader, `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString("base64")}`, [235]);
    await smtpCommand(socket, reader, "QUIT", [221]).catch(() => undefined);
  };
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      verification(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Tempo limite do SMTP excedido")), 7000);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    socket.destroy();
  }
}

export async function sendWhatsapp(to: string, message: string) {
  if (!process.env.WHATSAPP_PROVIDER_URL || !process.env.WHATSAPP_PROVIDER_TOKEN) {
    await createAuditLog(null, "whatsapp.skipped", { to, message });
    return;
  }
  try {
    const response = await fetch(process.env.WHATSAPP_PROVIDER_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHATSAPP_PROVIDER_TOKEN}` },
      body: JSON.stringify({ to, message })
    });
    if (!response.ok) {
      await createAuditLog(null, "whatsapp.failed", { to, status: response.status, statusText: response.statusText });
      return;
    }
    await createAuditLog(null, "whatsapp.sent", { to, status: response.status });
  } catch (error) {
    await createAuditLog(null, "whatsapp.failed", { to, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function sendSms(to: string, message: string) {
  if (!process.env.SMS_PROVIDER_URL || !process.env.SMS_PROVIDER_TOKEN) {
    await createAuditLog(null, "sms.skipped", { to, message });
    return;
  }
  await fetch(process.env.SMS_PROVIDER_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SMS_PROVIDER_TOKEN}` },
    body: JSON.stringify({ to, message })
  });
}

export async function queuePush(userId: string, title: string, message: string, options: NoticeOptions = {}) {
  const [{ data: tokens, error: tokensError }, { count: unreadCountRaw, error: countError }] = await Promise.all([
    db().from("PushToken").select("id,token").eq("userId", userId).eq("active", true),
    db().from("Notification").select("id", { count: "exact", head: true }).eq("userId", userId).is("readAt", null)
  ]);
  throwDbError(tokensError);
  throwDbError(countError);
  const unreadCount = unreadCountRaw ?? 0;

  if (!tokens?.length) {
    await createAuditLog(userId, "push.no_tokens", { title, message, ...options, unreadCount });
    return { sent: 0, failed: 0, unreadCount };
  }

  const messaging = getFirebaseAdminMessaging();
  if (!messaging) {
    await createAuditLog(userId, "push.skipped", { reason: "firebase_admin_not_configured", title, message, tokens: tokens.length, unreadCount });
    return { sent: 0, failed: tokens.length, unreadCount };
  }

  const url = options.primaryActionUrl || options.linkUrl || "/dashboard#interesses";
  const results = await Promise.allSettled(tokens.map(async ({ id, token }) => {
    try {
      await messaging.send({
        token,
        notification: { title, body: message },
        data: { type: "ACHEIX_NOTIFICATION", url, unreadCount: String(unreadCount), contactLeadId: options.contactLeadId ?? "", linkLabel: options.linkLabel ?? "" },
        android: { priority: "high", notification: { channelId: "interest-updates", sound: "default", notificationCount: unreadCount, clickAction: "OPEN_INTERESTS" } },
        webpush: { fcmOptions: { link: url }, notification: { icon: "/icon.svg", badge: "/icon.svg" } },
        apns: { payload: { aps: { sound: "default", badge: unreadCount } } }
      });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        await db().from("PushToken").update({ active: false }).eq("id", id);
      }
      throw error;
    }
  }));

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.filter((result) => result.status === "rejected").length;
  await createAuditLog(userId, "push.sent", { title, message, ...options, unreadCount, sent, failed });
  return { sent, failed, unreadCount };
}

async function createAuditLog(userId: string | null, action: string, metadata: Record<string, unknown>) {
  const { error } = await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
  throwDbError(error);
}

async function sendSmtpEmail(to: string, subject: string, body: string) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.SMTP_FROM || user;
  const secure = port === 465 || process.env.SMTP_SECURE === "true";
  let socket: net.Socket | tls.TLSSocket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  const reader = smtpReader(socket);
  await reader.expect([220]);
  await smtpCommand(socket, reader, `EHLO ${smtpDomain()}`, [250]);

  if (!secure) {
    await smtpCommand(socket, reader, "STARTTLS", [220]);
    socket = tls.connect({ socket, servername: host });
    reader.attach(socket);
    await smtpCommand(socket, reader, `EHLO ${smtpDomain()}`, [250]);
  }

  await smtpCommand(socket, reader, `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString("base64")}`, [235]);
  await smtpCommand(socket, reader, `MAIL FROM:<${emailAddress(from)}>`, [250]);
  await smtpCommand(socket, reader, `RCPT TO:<${emailAddress(to)}>`, [250, 251]);
  await smtpCommand(socket, reader, "DATA", [354]);
  await smtpCommand(socket, reader, smtpMessage({ from, to, subject, body }), [250]);
  await smtpCommand(socket, reader, "QUIT", [221]).catch(() => undefined);
  socket.end();
}

function smtpReader(initialSocket: net.Socket | tls.TLSSocket) {
  let socket = initialSocket;
  let buffer = "";
  let waiting: ((line: string) => void) | null = null;
  const onData = (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    flush();
  };
  const flush = () => {
    if (!waiting) return;
    const lines = buffer.split(/\r?\n/);
    const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));
    if (completeIndex === -1) return;
    const response = lines.slice(0, completeIndex + 1).join("\n");
    buffer = lines.slice(completeIndex + 1).join("\n");
    const resolve = waiting;
    waiting = null;
    resolve(response);
  };
  socket.on("data", onData);
  return {
    attach(nextSocket: net.Socket | tls.TLSSocket) {
      socket.removeListener("data", onData);
      socket = nextSocket;
      buffer = "";
      socket.on("data", onData);
    },
    async expect(codes: number[]) {
      const response = await new Promise<string>((resolve) => {
        waiting = resolve;
        flush();
      });
      const code = Number(response.slice(0, 3));
      if (!codes.includes(code)) throw new Error(`SMTP ${response.replace(/\s+/g, " ").trim()}`);
      return response;
    }
  };
}

async function smtpCommand(socket: net.Socket | tls.TLSSocket, reader: ReturnType<typeof smtpReader>, command: string, okCodes: number[]) {
  socket.write(`${command}\r\n`);
  return reader.expect(okCodes);
}

function smtpMessage(input: { from: string; to: string; subject: string; body: string }) {
  const subject = `=?UTF-8?B?${Buffer.from(input.subject, "utf8").toString("base64")}?=`;
  const body = input.body.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
    "."
  ].join("\r\n");
}

function emailAddress(value: string) {
  return value.match(/<([^>]+)>/)?.[1] ?? value.trim();
}

function smtpDomain() {
  return process.env.SMTP_DOMAIN || "acheix.com.br";
}
