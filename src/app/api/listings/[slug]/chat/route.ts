import { z } from "zod";
import { hasMobileContact } from "@/lib/account-requirements";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { chatLinksBlockedMessage, containsBlockedChatLink, validateContactMessageSafety } from "@/lib/message-safety";
import { createUserMessageAndNotify, listingCategoryToMessageCategory, markMessagesRead, messageCategoryLabel } from "@/lib/messages";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(1000, "Mensagem muito longa.")
});

const editMessageSchema = z.object({
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(1000, "Mensagem muito longa.")
});

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listing = await findListing(params.slug);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);
    if (listing.ownerId === user.id) {
      await markMessagesRead({ userId: user.id, listingId: listing.id });
      const conversations = await findOwnerConversations(listing.id, user.id);
      return json({ mode: "OWNER", conversations });
    }

    const conversation = await findConversation(listing.id, user.id);
    if (!conversation) return json({ mode: "INTERESTED", conversation: null, messages: [] });
    await markMessagesRead({ userId: user.id, conversationId: conversation.id });
    const messages = await findMessages(conversation.id);
    return json({ mode: "INTERESTED", conversation, messages });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    if (user.accountBlockedAt) return json({ error: "Sua conta está temporariamente impedida de enviar mensagens." }, 403);

    const listing = await findListing(params.slug);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);

    const data = chatMessageSchema.parse(await request.json());
    const isOwner = listing.ownerId === user.id;
    const conversation = isOwner
      ? await findOwnerConversationById(listing.id, user.id, data.conversationId)
      : await ensureConversation(listing.id, listing.ownerId, user.id);

    if (!conversation) return json({ error: "Conversa não encontrada neste anúncio." }, 404);

    const safety = await validateContactMessageSafety({
      request,
      sender: user,
      targetUserId: isOwner ? conversation.interestedUserId : listing.ownerId,
      message: data.body,
      context: { type: "LISTING_CHAT", listingId: listing.id }
    });
    if (!safety.allowed) return json({ error: safety.message }, safety.status ?? 403);

    const now = new Date().toISOString();
    const messageId = newDbId();
    const { error: messageError } = await db().from("ListingChatMessage").insert({
      id: messageId,
      conversationId: conversation.id,
      senderId: user.id,
      body: data.body,
      createdAt: now
    });
    throwDbError(messageError);

    const { error: updateError } = await db()
      .from("ListingChatConversation")
      .update({ updatedAt: now })
      .eq("id", conversation.id);
    throwDbError(updateError);

    const recipientId = isOwner ? conversation.interestedUserId : listing.ownerId;
    const category = listingCategoryToMessageCategory(listing.category);
    await createUserMessageAndNotify({
      category,
      listingId: listing.id,
      conversationId: conversation.id,
      sourceType: "LISTING_CHAT",
      sourceId: messageId,
      senderId: user.id,
      recipientId,
      body: data.body,
      push: {
        title: "Nova mensagem no Achei X",
        body: `Você recebeu uma nova mensagem em ${messageCategoryLabel(category)}.`,
        url: `${getAppBaseUrl(request)}/mensagens/${encodeURIComponent(`chat:${conversation.id}`)}`
      }
    });

    const messages = await findMessages(conversation.id);
    if (isOwner) {
      const conversations = await findOwnerConversations(listing.id, user.id);
      return json({ mode: "OWNER", conversations });
    }
    return json({ mode: "INTERESTED", conversation: { ...conversation, updatedAt: now }, messages });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listing = await findListing(params.slug);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const messageId = url.searchParams.get("messageId");

    if (conversationId) {
      const conversation = await findConversationForUser(listing.id, user.id, conversationId);
      if (!conversation) return json({ error: "Conversa não encontrada neste anúncio." }, 404);
      const { error: messagesError } = await db().from("ListingChatMessage").delete().eq("conversationId", conversation.id);
      throwDbError(messagesError);
      const { error: conversationError } = await db().from("ListingChatConversation").delete().eq("id", conversation.id);
      throwDbError(conversationError);
      return json({ ok: true });
    }

    if (messageId) {
      const message = await findMessageForUser(listing.id, user.id, messageId);
      if (!message) return json({ error: "Mensagem não encontrada neste anúncio." }, 404);
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
      const { error: messageError } = await db().from("ListingChatMessage").delete().eq("id", message.id);
      throwDbError(messageError);
      return json({ ok: true });
    }

    return json({ error: "Informe a conversa ou mensagem para excluir." }, 422);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listing = await findListing(params.slug);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);

    const url = new URL(request.url);
    const messageId = url.searchParams.get("messageId");
    if (messageId) {
      const input = editMessageSchema.parse(await request.json());
      if (containsBlockedChatLink(input.body)) return json({ error: chatLinksBlockedMessage }, 403);
      const message = await findMessageForUser(listing.id, user.id, messageId);
      if (!message) return json({ error: "Mensagem não encontrada neste anúncio." }, 404);
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
      const { error: messageError } = await db()
        .from("ListingChatMessage")
        .update({ body: input.body, editedAt: new Date().toISOString() })
        .eq("id", message.id);
      throwDbError(messageError);
      return json({ ok: true });
    }

    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) return json({ error: "Informe a conversa para denunciar." }, 422);

    const conversation = await findConversationForUser(listing.id, user.id, conversationId);
    if (!conversation) return json({ error: "Conversa não encontrada neste anúncio." }, 404);

    const { error } = await db().from("AuditLog").insert({
      id: newDbId(),
      userId: user.id,
      action: "listing_chat.reported",
      metadata: {
        listingId: listing.id,
        listingSlug: params.slug,
        conversationId: conversation.id,
        ownerId: conversation.ownerId,
        interestedUserId: conversation.interestedUserId,
        reportedAt: new Date().toISOString()
      }
    });
    throwDbError(error);

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

async function findListing(slug: string) {
  const { data, error } = await db()
    .from("Listing")
    .select("id,ownerId,status,category")
    .eq("slug", slug)
    .maybeSingle();
  throwDbError(error);
  return data as { id: string; ownerId: string; status: string; category: string } | null;
}

async function findConversation(listingId: string, interestedUserId: string) {
  const { data, error } = await db()
    .from("ListingChatConversation")
    .select("id,listingId,ownerId,interestedUserId,status,createdAt,updatedAt")
    .eq("listingId", listingId)
    .eq("interestedUserId", interestedUserId)
    .maybeSingle();
  throwDbError(error);
  return data as any | null;
}

async function findOwnerConversationById(listingId: string, ownerId: string, conversationId?: string) {
  if (!conversationId) return null;
  const { data, error } = await db()
    .from("ListingChatConversation")
    .select("id,listingId,ownerId,interestedUserId,status,createdAt,updatedAt")
    .eq("id", conversationId)
    .eq("listingId", listingId)
    .eq("ownerId", ownerId)
    .maybeSingle();
  throwDbError(error);
  return data as any | null;
}

async function findConversationForUser(listingId: string, userId: string, conversationId: string) {
  const { data, error } = await db()
    .from("ListingChatConversation")
    .select("id,listingId,ownerId,interestedUserId,status,createdAt,updatedAt")
    .eq("id", conversationId)
    .eq("listingId", listingId)
    .or(`ownerId.eq.${userId},interestedUserId.eq.${userId}`)
    .maybeSingle();
  throwDbError(error);
  return data as any | null;
}

async function findMessageForUser(listingId: string, userId: string, messageId: string) {
  const { data: message, error } = await db()
    .from("ListingChatMessage")
    .select("id,conversationId,senderId")
    .eq("id", messageId)
    .eq("senderId", userId)
    .maybeSingle();
  throwDbError(error);
  if (!message) return null;

  const conversation = await findConversationForUser(listingId, userId, message.conversationId);
  return conversation ? message : null;
}

async function findOwnerConversations(listingId: string, ownerId: string) {
  const { data, error } = await db()
    .from("ListingChatConversation")
    .select("id,listingId,ownerId,interestedUserId,status,createdAt,updatedAt")
    .eq("listingId", listingId)
    .eq("ownerId", ownerId)
    .order("updatedAt", { ascending: false })
    .limit(30);
  throwDbError(error);

  const conversations = data ?? [];
  if (!conversations.length) return [];

  const { data: messages, error: messagesError } = await db()
    .from("ListingChatMessage")
    .select("id,conversationId,senderId,body,createdAt,editedAt")
    .in("conversationId", conversations.map((conversation) => conversation.id))
    .order("createdAt", { ascending: true })
    .limit(300);
  throwDbError(messagesError);

  const interestedUserIds = [...new Set(conversations.map((conversation) => conversation.interestedUserId).filter(Boolean))];
  const { data: interestedUsers, error: interestedUsersError } = await db()
    .from("User")
    .select("id,name,email,phone,whatsapp")
    .in("id", interestedUserIds);
  throwDbError(interestedUsersError);
  const interestedById = new Map((interestedUsers ?? []).map((user) => [user.id, user]));
  const messagesWithReadState = await attachReadStates(messages ?? []);

  return conversations.map((conversation) => ({
    ...conversation,
    interestedUser: interestedById.get(conversation.interestedUserId) ?? null,
    safetyNotice: !hasMobileContact(interestedById.get(conversation.interestedUserId) ?? {})
      ? "Aviso de segurança: o interessado neste anúncio ainda não cadastrou telefone ou WhatsApp no Achei X. Nunca clique em links, não forneça dados pessoais fora do app e mantenha a negociação pelo chat."
      : null,
    messages: messagesWithReadState.filter((message) => message.conversationId === conversation.id)
  }));
}

async function ensureConversation(listingId: string, ownerId: string, interestedUserId: string) {
  const existing = await findConversation(listingId, interestedUserId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("ListingChatConversation")
    .insert({
      id: newDbId(),
      listingId,
      ownerId,
      interestedUserId,
      status: "OPEN",
      createdAt: now,
      updatedAt: now
    })
    .select("id,listingId,ownerId,interestedUserId,status,createdAt,updatedAt")
    .single();
  throwDbError(error);
  return data as any;
}

async function findMessages(conversationId: string) {
  const { data, error } = await db()
    .from("ListingChatMessage")
    .select("id,conversationId,senderId,body,createdAt,editedAt")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: true })
    .limit(100);
  throwDbError(error);
  return attachReadStates(data ?? []);
}

async function attachReadStates(messages: any[]) {
  if (!messages.length) return messages;
  const { data, error } = await db()
    .from("UserMessage")
    .select("sourceId,readAt")
    .eq("sourceType", "LISTING_CHAT")
    .in("sourceId", messages.map((message) => message.id));
  throwDbError(error);
  const readAtByMessage = new Map((data ?? []).map((item: any) => [item.sourceId, item.readAt ?? null]));
  return messages.map((message) => ({ ...message, readAt: readAtByMessage.get(message.id) ?? null }));
}

function getAppBaseUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedBaseUrl = forwardedHost
    ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
    : undefined;
  return (process.env.APP_URL || forwardedBaseUrl || "http://localhost:3000").replace(/\/$/, "");
}
