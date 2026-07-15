import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(500)).min(1).max(200).optional(),
  all: z.boolean().optional()
}).refine((value) => value.all === true || Boolean(value.ids?.length), "Selecione ao menos uma conversa.");

type UserMessageRow = {
  id: string;
  category: "VEHICLES" | "REAL_ESTATE" | "SERVICES";
  listingId: string | null;
  serviceProfileId: string | null;
  conversationId: string | null;
  sourceType: string;
  sourceId: string | null;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export async function GET() {
  try {
    const user = await requireUser();
    const { data, error } = await db()
      .from("UserMessage")
      .select("id,category,listingId,serviceProfileId,conversationId,sourceType,sourceId,senderId,recipientId,body,createdAt,readAt")
      .or(`senderId.eq.${user.id},recipientId.eq.${user.id}`)
      .order("createdAt", { ascending: false })
      .limit(200);
    throwDbError(error);

    const allMessages = (data ?? []) as UserMessageRow[];
    const { data: deletionRows, error: deletionError } = await db()
      .from("MessageConversationDeletion")
      .select("conversationKey,deletedAt")
      .eq("userId", user.id);
    throwDbError(deletionError);
    const deletedAtByKey = new Map((deletionRows ?? []).map((row: any) => [row.conversationKey, new Date(row.deletedAt).getTime()]));
    const messages = allMessages.filter((message) => {
      const deletedAt = deletedAtByKey.get(conversationKey(message));
      return deletedAt === undefined || new Date(message.createdAt).getTime() > deletedAt;
    });
    const grouped = new Map<string, { key: string; messages: UserMessageRow[] }>();
    for (const message of messages) {
      const key = conversationKey(message);
      const group = grouped.get(key) ?? { key, messages: [] };
      group.messages.push(message);
      grouped.set(key, group);
    }

    const listingIds = [...new Set(messages.map((message) => message.listingId).filter((id): id is string => Boolean(id)))];
    const serviceProfileIds = [...new Set(messages.map((message) => message.serviceProfileId).filter((id): id is string => Boolean(id)))];
    const otherUserIds = [...new Set(messages.map((message) => message.senderId === user.id ? message.recipientId : message.senderId).filter(Boolean))];

    const [listingsResult, photosResult, serviceProfilesResult, usersResult] = await Promise.all([
      listingIds.length ? db().from("Listing").select("id,title,slug,category,type,priceCents,city,state").in("id", listingIds) : Promise.resolve({ data: [], error: null }),
      listingIds.length ? db().from("Photo").select("listingId,url,order").in("listingId", listingIds).order("order", { ascending: true }) : Promise.resolve({ data: [], error: null }),
      serviceProfileIds.length ? db().from("service_profiles").select("id,name,nome_fantasia,categoria_servico,cidade,estado,logo_empresa").in("id", serviceProfileIds) : Promise.resolve({ data: [], error: null }),
      otherUserIds.length ? db().from("User").select("id,name,email,phone,whatsapp").in("id", otherUserIds) : Promise.resolve({ data: [], error: null })
    ]);
    throwDbError(listingsResult.error);
    throwDbError(photosResult.error);
    throwDbError(serviceProfilesResult.error);
    throwDbError(usersResult.error);

    const listings = new Map((listingsResult.data ?? []).map((listing: any) => [listing.id, listing]));
    const serviceProfiles = new Map((serviceProfilesResult.data ?? []).map((profile: any) => [profile.id, profile]));
    const users = new Map((usersResult.data ?? []).map((item: any) => [item.id, item]));
    const photos = new Map<string, string | null>();
    for (const photo of (photosResult.data ?? []) as Array<{ listingId: string; url: string | null }>) {
      if (!photos.has(photo.listingId)) photos.set(photo.listingId, photo.url ?? null);
    }

    const conversations = [...grouped.values()].map((group) => {
      const sorted = [...group.messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const last = sorted[0];
      const otherUserId = last.senderId === user.id ? last.recipientId : last.senderId;
      const otherUser = users.get(otherUserId);
      const listing = last.listingId ? listings.get(last.listingId) : null;
      const service = last.serviceProfileId ? serviceProfiles.get(last.serviceProfileId) : null;
      const unreadCount = group.messages.filter((message) => message.recipientId === user.id && !message.readAt).length;
      const href = `/mensagens/${encodeURIComponent(group.key)}`;

      return {
        id: group.key,
        category: last.category,
        direction: last.senderId === user.id ? "SENT" : "RECEIVED",
        unreadCount,
        lastMessage: {
          id: last.id,
          body: last.body,
          createdAt: last.createdAt,
          mine: last.senderId === user.id
        },
        contact: {
          id: otherUserId,
          name: otherUser?.name ?? otherUser?.email ?? "Usuário Achei X",
          email: otherUser?.email ?? null,
          phone: otherUser?.phone ?? otherUser?.whatsapp ?? null
        },
        target: listing ? {
          kind: "LISTING",
          title: listing.title,
          slug: listing.slug,
          category: listing.category,
          type: listing.type,
          city: listing.city,
          state: listing.state,
          priceCents: listing.priceCents,
          imageUrl: photos.get(listing.id) ?? null,
          href,
          fallbackHref: `/anuncios/${listing.slug}`
        } : {
          kind: "SERVICE",
          title: service?.nome_fantasia ?? service?.name ?? "Serviço Achei X",
          category: service?.categoria_servico ?? null,
          city: service?.cidade ?? null,
          state: service?.estado ?? null,
          imageUrl: service?.logo_empresa ?? null,
          href,
          fallbackHref: service?.id ? `/servicos/${service.id}` : "/mensagens"
        }
      };
    }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

    return json({ conversations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const input = deleteSchema.parse(await request.json());
    let ids = input.ids ?? [];

    if (input.all) {
      const { data, error } = await db()
        .from("UserMessage")
        .select("id,category,listingId,serviceProfileId,conversationId,sourceType,sourceId,senderId,recipientId,body,createdAt,readAt")
        .or(`senderId.eq.${user.id},recipientId.eq.${user.id}`)
        .limit(1000);
      throwDbError(error);
      ids = [...new Set(((data ?? []) as UserMessageRow[]).map(conversationKey))];
    }

    if (!ids.length) return json({ deleted: 0 });
    const deletedAt = new Date().toISOString();
    const { error } = await db().from("MessageConversationDeletion").upsert(
      ids.map((conversationKeyValue) => ({ userId: user.id, conversationKey: conversationKeyValue, deletedAt })),
      { onConflict: "userId,conversationKey" }
    );
    throwDbError(error);
    return json({ deleted: ids.length });
  } catch (error) {
    return errorResponse(error);
  }
}

function conversationKey(message: UserMessageRow) {
  if (message.conversationId) return `chat:${message.conversationId}`;
  if (message.sourceId) return `${message.sourceType}:${message.sourceId}`;
  const participants = [message.senderId, message.recipientId].sort().join(":");
  return `${message.category}:${message.listingId ?? message.serviceProfileId ?? "direct"}:${participants}`;
}
