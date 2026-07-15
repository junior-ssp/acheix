import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { chatLinksBlockedMessage, containsBlockedChatLink, validateContactMessageSafety } from "@/lib/message-safety";
import { createUserMessageAndNotify, listingCategoryToMessageCategory, markMessagesRead, messageCategoryLabel } from "@/lib/messages";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { getUserBlockState, isMessagingBlockedBetween } from "@/lib/user-blocks";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(1000, "Mensagem muito longa.")
});

const editSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(1000, "Mensagem muito longa.")
});

const deleteSchema = z.object({
  messageId: z.string().uuid()
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const key = decodeURIComponent(params.id);
    if (!key.startsWith("chat:")) return json({ error: "Conversa antiga sem chat interno. Abra o anúncio para continuar." }, 422);

    const conversationId = key.slice("chat:".length);
    const conversation = await findConversationForUser(conversationId, user.id);
    if (!conversation) return json({ error: "Conversa não encontrada." }, 404);

    await markMessagesRead({ userId: user.id, conversationId });
    const [listing, messages, users, photo] = await Promise.all([
      findListing(conversation.listingId),
      findMessages(conversationId),
      findUsers([conversation.ownerId, conversation.interestedUserId]),
      findListingPhoto(conversation.listingId)
    ]);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);

    const otherUserId = conversation.ownerId === user.id ? conversation.interestedUserId : conversation.ownerId;
    const otherUser = users.get(otherUserId);
    const blockState = await getUserBlockState(user.id, otherUserId);
    return json({
      conversation: {
        id: conversation.id,
        listingId: conversation.listingId,
        title: listing.title,
        slug: listing.slug,
        category: listing.category,
        city: listing.city,
        state: listing.state,
        imageUrl: photo,
        blockState,
        otherUser: {
          id: otherUserId,
          name: otherUser?.name ?? otherUser?.email ?? "Usuário Achei X",
          email: otherUser?.email ?? null,
          phone: otherUser?.phone ?? otherUser?.whatsapp ?? null
        }
      },
      messages: messages.map((message) => ({ ...message, mine: message.senderId === user.id }))
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.accountBlockedAt) return json({ error: "Sua conta está temporariamente impedida de enviar mensagens." }, 403);

    const key = decodeURIComponent(params.id);
    if (!key.startsWith("chat:")) return json({ error: "Esta conversa ainda não aceita resposta direta." }, 422);
    const conversationId = key.slice("chat:".length);
    const conversation = await findConversationForUser(conversationId, user.id);
    if (!conversation) return json({ error: "Conversa não encontrada." }, 404);

    const recipientId = user.id === conversation.ownerId ? conversation.interestedUserId : conversation.ownerId;
    if (await isMessagingBlockedBetween(user.id, recipientId)) {
      return json({ error: "Esta conversa foi encerrada por bloqueio. Nenhuma das contas pode enviar novas mensagens." }, 403);
    }

    const listing = await findListing(conversation.listingId);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);
    if (["BLOCKED", "DELETED", "REMOVED", "REJECTED"].includes(listing.status)) return json({ error: "Este anúncio não aceita novas mensagens." }, 403);

    const data = sendSchema.parse(await request.json());
    const safety = await validateContactMessageSafety({
      request,
      sender: user,
      targetUserId: recipientId,
      message: data.body,
      context: { type: "LISTING_CHAT", listingId: listing.id }
    });
    if (!safety.allowed) return json({ error: safety.message }, safety.status ?? 403);
    const now = new Date().toISOString();
    const messageId = newDbId();
    const { error: messageError } = await db().from("ListingChatMessage").insert({
      id: messageId,
      conversationId,
      senderId: user.id,
      body: data.body,
      createdAt: now
    });
    throwDbError(messageError);

    const { error: updateError } = await db()
      .from("ListingChatConversation")
      .update({ updatedAt: now })
      .eq("id", conversationId);
    throwDbError(updateError);

    const category = listingCategoryToMessageCategory(listing.category);
    const url = `${getAppBaseUrl(request)}/mensagens/${encodeURIComponent(`chat:${conversationId}`)}`;
    await createUserMessageAndNotify({
      category,
      listingId: listing.id,
      conversationId,
      sourceType: "LISTING_CHAT",
      sourceId: messageId,
      senderId: user.id,
      recipientId,
      body: data.body,
      push: {
        title: "Nova mensagem no Achei X",
        body: `Você recebeu uma nova mensagem em ${messageCategoryLabel(category)}.`,
        url
      }
    });

    const messages = await findMessages(conversationId);
    return json({ messages: messages.map((message) => ({ ...message, mine: message.senderId === user.id })) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const key = decodeURIComponent(params.id);
    if (!key.startsWith("chat:")) return json({ error: "Esta conversa não permite edição." }, 422);
    const conversationId = key.slice("chat:".length);
    const conversation = await findConversationForUser(conversationId, user.id);
    if (!conversation) return json({ error: "Conversa não encontrada." }, 404);
    const recipientId = user.id === conversation.ownerId ? conversation.interestedUserId : conversation.ownerId;
    if (await isMessagingBlockedBetween(user.id, recipientId)) return json({ error: "Esta conversa foi encerrada por bloqueio." }, 403);

    const input = editSchema.parse(await request.json());
    if (containsBlockedChatLink(input.body)) return json({ error: chatLinksBlockedMessage }, 403);
    const { data: message, error: messageError } = await db()
      .from("ListingChatMessage")
      .select("id,conversationId,senderId")
      .eq("id", input.messageId)
      .eq("conversationId", conversationId)
      .eq("senderId", user.id)
      .maybeSingle();
    throwDbError(messageError);
    if (!message) return json({ error: "Mensagem não encontrada." }, 404);
    const { data: unreadMirror, error: mirrorError } = await db()
      .from("UserMessage")
      .update({ body: input.body })
      .eq("sourceType", "LISTING_CHAT")
      .eq("sourceId", message.id)
      .eq("senderId", user.id)
      .is("readAt", null)
      .select("id")
      .maybeSingle();
    throwDbError(mirrorError);
    if (!unreadMirror) return json({ error: "Esta mensagem já foi lida e não pode mais ser editada." }, 409);

    const editedAt = new Date().toISOString();
    const { error: updateError } = await db()
      .from("ListingChatMessage")
      .update({ body: input.body, editedAt })
      .eq("id", message.id);
    throwDbError(updateError);
    const messages = await findMessages(conversationId);
    return json({ messages: messages.map((item) => ({ ...item, mine: item.senderId === user.id })) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const key = decodeURIComponent(params.id);
    if (!key.startsWith("chat:")) return json({ error: "Esta conversa não permite exclusão." }, 422);
    const conversationId = key.slice("chat:".length);
    const conversation = await findConversationForUser(conversationId, user.id);
    if (!conversation) return json({ error: "Conversa não encontrada." }, 404);
    const recipientId = user.id === conversation.ownerId ? conversation.interestedUserId : conversation.ownerId;
    if (await isMessagingBlockedBetween(user.id, recipientId)) return json({ error: "Esta conversa foi encerrada por bloqueio." }, 403);

    const input = deleteSchema.parse(await request.json());
    const { data: message, error: messageError } = await db()
      .from("ListingChatMessage")
      .select("id,conversationId,senderId")
      .eq("id", input.messageId)
      .eq("conversationId", conversationId)
      .eq("senderId", user.id)
      .maybeSingle();
    throwDbError(messageError);
    if (!message) return json({ error: "Mensagem não encontrada." }, 404);

    const { data: unreadMirror, error: mirrorError } = await db()
      .from("UserMessage")
      .delete()
      .eq("sourceType", "LISTING_CHAT")
      .eq("sourceId", message.id)
      .eq("senderId", user.id)
      .is("readAt", null)
      .select("id")
      .maybeSingle();
    throwDbError(mirrorError);
    if (!unreadMirror) return json({ error: "Esta mensagem já foi lida e não pode mais ser excluída." }, 409);

    const { error: deleteError } = await db().from("ListingChatMessage").delete().eq("id", message.id);
    throwDbError(deleteError);
    const { error: updateError } = await db()
      .from("ListingChatConversation")
      .update({ updatedAt: new Date().toISOString() })
      .eq("id", conversationId);
    throwDbError(updateError);

    const messages = await findMessages(conversationId);
    return json({ messages: messages.map((item) => ({ ...item, mine: item.senderId === user.id })) });
  } catch (error) {
    return errorResponse(error);
  }
}

async function findConversationForUser(conversationId: string, userId: string) {
  const { data, error } = await db()
    .from("ListingChatConversation")
    .select("id,listingId,ownerId,interestedUserId,status,createdAt,updatedAt")
    .eq("id", conversationId)
    .or(`ownerId.eq.${userId},interestedUserId.eq.${userId}`)
    .maybeSingle();
  throwDbError(error);
  return data as { id: string; listingId: string; ownerId: string; interestedUserId: string } | null;
}

async function findListing(listingId: string) {
  const { data, error } = await db()
    .from("Listing")
    .select("id,title,slug,category,city,state,status")
    .eq("id", listingId)
    .maybeSingle();
  throwDbError(error);
  return data as { id: string; title: string; slug: string; category: string; city: string | null; state: string | null; status: string } | null;
}

async function findMessages(conversationId: string) {
  const { data, error } = await db()
    .from("ListingChatMessage")
    .select("id,conversationId,senderId,body,createdAt,editedAt")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: true })
    .limit(200);
  throwDbError(error);
  const messages = (data ?? []) as Array<{ id: string; conversationId: string; senderId: string; body: string; createdAt: string; editedAt: string | null }>;
  if (!messages.length) return messages;
  const { data: mirrors, error: mirrorsError } = await db()
    .from("UserMessage")
    .select("sourceId,readAt")
    .eq("sourceType", "LISTING_CHAT")
    .in("sourceId", messages.map((message) => message.id));
  throwDbError(mirrorsError);
  const readAtByMessage = new Map((mirrors ?? []).map((mirror: any) => [mirror.sourceId, mirror.readAt ?? null]));
  return messages.map((message) => ({ ...message, readAt: readAtByMessage.get(message.id) ?? null }));
}

async function findUsers(userIds: string[]) {
  const { data, error } = await db()
    .from("User")
    .select("id,name,email,phone,whatsapp")
    .in("id", [...new Set(userIds)]);
  throwDbError(error);
  return new Map((data ?? []).map((item: any) => [item.id, item]));
}

async function findListingPhoto(listingId: string) {
  const { data, error } = await db()
    .from("Photo")
    .select("url")
    .eq("listingId", listingId)
    .order("order", { ascending: true })
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return data?.url ?? null;
}

function getAppBaseUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedBaseUrl = forwardedHost
    ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
    : undefined;
  return (process.env.APP_URL || forwardedBaseUrl || "http://localhost:3000").replace(/\/$/, "");
}
