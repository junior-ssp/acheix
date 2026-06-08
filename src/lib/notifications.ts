import { getFirebaseAdminMessaging } from "@/lib/firebase-admin";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

type NoticeOptions = {
  linkLabel?: string;
  linkUrl?: string;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
  contactLeadId?: string;
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

export async function createNotification(userId: string, title: string, message: string, options: NoticeOptions = {}) {
  const { data, error } = await db()
    .from("Notification")
    .insert({ id: newDbId(), userId, title, message, ...options })
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
  if (uniqueChannels.includes("PUSH")) await queuePush(user.id, title, message, options);
}

function normalizeNoticeChannels(channels: NoticeChannel[]) {
  return [...new Set([...channels, "IN_APP", "EMAIL", "WHATSAPP", "PUSH"])] as NoticeChannel[];
}

export async function sendEmail(to: string, subject: string, body: string) {
  if (!process.env.SMTP_HOST) {
    await createAuditLog(null, "email.skipped", { to, subject, body });
    return;
  }
  await createAuditLog(null, "email.queued", { to, subject });
}

export async function sendWhatsapp(to: string, message: string) {
  if (!process.env.WHATSAPP_PROVIDER_URL || !process.env.WHATSAPP_PROVIDER_TOKEN) {
    await createAuditLog(null, "whatsapp.skipped", { to, message });
    return;
  }
  await fetch(process.env.WHATSAPP_PROVIDER_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHATSAPP_PROVIDER_TOKEN}` },
    body: JSON.stringify({ to, message })
  });
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
