import { getFirebaseAdminMessaging } from "@/lib/firebase-admin";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export type MessageCategory = "VEHICLES" | "REAL_ESTATE" | "SERVICES" | "PRODUCTS";

type CreateUserMessageInput = {
  category: MessageCategory;
  listingId?: string | null;
  serviceProfileId?: string | null;
  conversationId?: string | null;
  sourceType: "DIRECT" | "CONTACT_LEAD" | "SERVICE_CONTACT" | "LISTING_CHAT";
  sourceId?: string | null;
  senderId: string;
  recipientId: string;
  body: string;
  push?: {
    title?: string;
    body?: string;
    url: string;
  };
};

export type MessageUnreadCounts = {
  vehicles: number;
  realEstate: number;
  services: number;
  products: number;
  total: number;
};

export function listingCategoryToMessageCategory(value: string): MessageCategory {
  if (value === "REAL_ESTATE") return "REAL_ESTATE";
  if (value === "PRODUCT") return "PRODUCTS";
  return "VEHICLES";
}

export function messageCategoryLabel(category: MessageCategory) {
  if (category === "VEHICLES") return "Veículos";
  if (category === "REAL_ESTATE") return "Imóveis";
  if (category === "PRODUCTS") return "Produtos";
  return "Serviços";
}

export async function createUserMessageAndNotify(input: CreateUserMessageInput) {
  const message = await createUserMessage(input);
  const counts = await getUnreadMessageCounts(input.recipientId);
  if (input.push) {
    await sendMessagePushNotification(input.recipientId, {
      messageId: message.id,
      category: input.category,
      title: input.push.title ?? "Nova mensagem no Achei X",
      body: input.push.body ?? `Você recebeu uma nova mensagem em ${messageCategoryLabel(input.category)}.`,
      url: input.push.url,
      unreadCounts: counts
    });
  }
  return { message, unreadCounts: counts };
}

export async function createUserMessage(input: CreateUserMessageInput) {
  if (input.sourceId) {
    const { data: existing, error: existingError } = await db()
      .from("UserMessage")
      .select("*")
      .eq("sourceType", input.sourceType)
      .eq("sourceId", input.sourceId)
      .maybeSingle();
    if (isMissingRelation(existingError)) return fallbackMessage({ id: newDbId() });
    throwDbError(existingError);
    if (existing) return existing as any;
  }

  const now = new Date().toISOString();
  const payload = {
    id: newDbId(),
    category: input.category,
    listingId: input.listingId ?? null,
    serviceProfileId: input.serviceProfileId ?? null,
    conversationId: input.conversationId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    senderId: input.senderId,
    recipientId: input.recipientId,
    body: input.body,
    status: "SENT",
    createdAt: now
  };
  const { data, error } = await db().from("UserMessage").insert(payload).select("*").single();
  if (isMissingRelation(error)) return fallbackMessage(payload);
  throwDbError(error);
  return data as any;
}

export async function getUnreadMessageCounts(userId: string): Promise<MessageUnreadCounts> {
  const { data, error } = await db()
    .from("UserMessage")
    .select("category")
    .eq("recipientId", userId)
    .is("readAt", null);
  if (isMissingRelation(error)) return { vehicles: 0, realEstate: 0, services: 0, products: 0, total: 0 };
  throwDbError(error);

  const counts = { vehicles: 0, realEstate: 0, services: 0, products: 0, total: 0 };
  for (const row of (data ?? []) as Array<{ category: MessageCategory }>) {
    if (row.category === "VEHICLES") counts.vehicles += 1;
    if (row.category === "REAL_ESTATE") counts.realEstate += 1;
    if (row.category === "SERVICES") counts.services += 1;
    if (row.category === "PRODUCTS") counts.products += 1;
    counts.total += 1;
  }
  return counts;
}

export async function markMessagesRead(input: {
  userId: string;
  category?: MessageCategory;
  listingId?: string;
  serviceProfileId?: string;
  conversationId?: string;
  sourceId?: string;
}) {
  const now = new Date().toISOString();
  let request = db()
    .from("UserMessage")
    .update({ status: "READ", readAt: now })
    .eq("recipientId", input.userId)
    .is("readAt", null);

  if (input.category) request = request.eq("category", input.category);
  if (input.listingId) request = request.eq("listingId", input.listingId);
  if (input.serviceProfileId) request = request.eq("serviceProfileId", input.serviceProfileId);
  if (input.conversationId) request = request.eq("conversationId", input.conversationId);
  if (input.sourceId) request = request.eq("sourceId", input.sourceId);

  const { error } = await request;
  if (isMissingRelation(error)) return getUnreadMessageCounts(input.userId);
  throwDbError(error);
  return getUnreadMessageCounts(input.userId);
}

async function sendMessagePushNotification(userId: string, input: {
  messageId: string;
  category: MessageCategory;
  title: string;
  body: string;
  url: string;
  unreadCounts: MessageUnreadCounts;
}) {
  const { data: user, error: userError } = await db()
    .from("User")
    .select("notificationChannels,notificationChannel")
    .eq("id", userId)
    .maybeSingle();
  throwDbError(userError);

  const channels = normalizeUserChannels(user as { notificationChannels?: string[] | null; notificationChannel?: string | null } | null);
  if (!channels.includes("PUSH")) {
    await createPushLog(userId, input, "SKIPPED", "push_channel_disabled");
    return { sent: 0, failed: 0 };
  }

  const { data: tokens, error: tokensError } = await db()
    .from("PushToken")
    .select("id,token")
    .eq("userId", userId)
    .eq("active", true);
  throwDbError(tokensError);

  if (!tokens?.length) {
    await createPushLog(userId, input, "NO_TOKENS");
    return { sent: 0, failed: 0 };
  }

  const messaging = getFirebaseAdminMessaging();
  if (!messaging) {
    await createPushLog(userId, input, "SKIPPED", "firebase_admin_not_configured", { tokens: tokens.length });
    return { sent: 0, failed: tokens.length };
  }

  const results = await Promise.allSettled(tokens.map(async ({ id, token }) => {
    try {
      await messaging.send({
        token,
        notification: { title: input.title, body: input.body },
        data: {
          type: "ACHEIX_MESSAGE",
          url: input.url,
          messageId: input.messageId,
          category: input.category,
          unreadCount: String(input.unreadCounts.total),
          unreadVehicles: String(input.unreadCounts.vehicles),
          unreadRealEstate: String(input.unreadCounts.realEstate),
          unreadServices: String(input.unreadCounts.services)
        },
        android: {
          priority: "high",
          notification: {
            channelId: "messages",
            sound: "default",
            notificationCount: input.unreadCounts.total,
            clickAction: "OPEN_MESSAGES"
          }
        },
        webpush: {
          fcmOptions: { link: input.url },
          notification: { icon: "/icon.svg", badge: "/icon.svg" }
        },
        apns: { payload: { aps: { sound: "default", badge: input.unreadCounts.total } } }
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
  await createPushLog(userId, input, failed ? "FAILED" : "SENT", failed ? `${failed} token(s) falharam` : undefined, { sent, failed });
  return { sent, failed };
}

function normalizeUserChannels(user: { notificationChannels?: string[] | null; notificationChannel?: string | null } | null) {
  const channels = user?.notificationChannels?.length ? user.notificationChannels : [user?.notificationChannel ?? "IN_APP"];
  return [...new Set([...channels, "IN_APP", "PUSH"])];
}

async function createPushLog(userId: string, input: {
  messageId: string;
  category: MessageCategory;
  title: string;
  body: string;
  url: string;
  unreadCounts: MessageUnreadCounts;
}, status: "SENT" | "FAILED" | "SKIPPED" | "NO_TOKENS", error?: string, metadata: Record<string, unknown> = {}) {
  const payload = {
    id: newDbId(),
    userId,
    messageId: input.messageId,
    category: input.category,
    status,
    error: error ?? null,
    metadata: { title: input.title, body: input.body, url: input.url, unreadCounts: input.unreadCounts, ...metadata }
  };
  const { error: insertError } = await db().from("PushDeliveryLog").insert(payload);
  if (isMissingRelation(insertError)) return;
  throwDbError(insertError);
}

function fallbackMessage(payload: Record<string, unknown>) {
  return payload as { id: string };
}

function isMissingRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "42P01" || code === "PGRST205";
}
