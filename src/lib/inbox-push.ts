import { getFirebaseAdminMessaging } from "@/lib/firebase-admin";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

type InboxPushPayload = {
  title: string;
  body: string;
  url: string;
  leadId: string;
  listingTitle: string;
};

export async function sendInboxPushNotification(userId: string, payload: InboxPushPayload) {
  const { data: listings, error: listingsError } = await db()
    .from("Listing")
    .select("id")
    .eq("ownerId", userId);
  throwDbError(listingsError);
  const listingIds = (listings ?? []).map((item) => item.id).filter(Boolean);

  let unreadCount = 0;
  if (listingIds.length) {
    const { count, error } = await db()
      .from("ContactLead")
      .select("id", { count: "exact", head: true })
      .in("listingId", listingIds)
      .is("readAt", null);
    throwDbError(error);
    unreadCount = count ?? 0;
  }

  const { data: tokens, error: tokensError } = await db()
    .from("PushToken")
    .select("id,token")
    .eq("userId", userId)
    .eq("active", true);
  throwDbError(tokensError);

  if (!tokens?.length) {
    await createAuditLog(userId, "push.inbox.no_tokens", { leadId: payload.leadId, unreadCount });
    return;
  }

  const messaging = getFirebaseAdminMessaging();
  if (!messaging) {
    await createAuditLog(userId, "push.inbox.skipped", { reason: "firebase_admin_not_configured", leadId: payload.leadId, tokens: tokens.length, unreadCount });
    return;
  }

  const results = await Promise.allSettled(
    tokens.map(async ({ id, token }) => {
      try {
        await messaging.send({
          token,
          notification: { title: payload.title, body: payload.body },
          data: {
            type: "INBOX_MESSAGE",
            url: payload.url,
            leadId: payload.leadId,
            listingTitle: payload.listingTitle,
            unreadCount: String(unreadCount)
          },
          android: {
            priority: "high",
            notification: { channelId: "interest-updates", sound: "default", notificationCount: unreadCount, clickAction: "OPEN_INTERESTS" }
          },
          apns: { payload: { aps: { sound: "default", badge: unreadCount } } }
        });
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
          await db().from("PushToken").update({ active: false }).eq("id", id);
        }
        throw error;
      }
    })
  );

  await createAuditLog(userId, "push.inbox.sent", {
    leadId: payload.leadId,
    unreadCount,
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length
  });
}

async function createAuditLog(userId: string | null, action: string, metadata: Record<string, unknown>) {
  const { error } = await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
  throwDbError(error);
}
