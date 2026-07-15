import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.id === params.id) return json({ error: "Você não pode bloquear sua própria conta." }, 422);

    const { data: target, error: targetError } = await db()
      .from("User")
      .select("id,name,email")
      .eq("id", params.id)
      .maybeSingle();
    throwDbError(targetError);
    if (!target) return json({ error: "Usuário não encontrado." }, 404);

    const { data: existing, error: existingError } = await db()
      .from("AuditLog")
      .select("id")
      .eq("userId", user.id)
      .eq("action", "user.blocked")
      .contains("metadata", { blockedUserId: target.id })
      .maybeSingle();
    throwDbError(existingError);

    if (!existing) {
      const { error: auditError } = await db().from("AuditLog").insert({
        id: newDbId(),
        userId: user.id,
        action: "user.blocked",
        metadata: { blockedUserId: target.id, blockedUserName: target.name }
      });
      throwDbError(auditError);
    }

    const { data: sharedMessages, error: messagesError } = await db()
      .from("UserMessage")
      .select("category,listingId,serviceProfileId,conversationId,sourceType,sourceId,senderId,recipientId")
      .or(`and(senderId.eq.${user.id},recipientId.eq.${target.id}),and(senderId.eq.${target.id},recipientId.eq.${user.id})`)
      .limit(1000);
    throwDbError(messagesError);
    const conversationKeys = [...new Set((sharedMessages ?? []).map(messageConversationKey))];
    if (conversationKeys.length) {
      const deletedAt = new Date().toISOString();
      const { error: deletionError } = await db().from("MessageConversationDeletion").upsert(
        conversationKeys.map((conversationKey) => ({ userId: user.id, conversationKey, deletedAt })),
        { onConflict: "userId,conversationKey" }
      );
      throwDbError(deletionError);
    }

    return json({ ok: true, hiddenConversations: conversationKeys.length });
  } catch (error) {
    return errorResponse(error);
  }
}

function messageConversationKey(message: any) {
  if (message.conversationId) return `chat:${message.conversationId}`;
  if (message.sourceId) return `${message.sourceType}:${message.sourceId}`;
  const participants = [message.senderId, message.recipientId].sort().join(":");
  return `${message.category}:${message.listingId ?? message.serviceProfileId ?? "direct"}:${participants}`;
}
