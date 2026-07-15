import { requireUser } from "@/lib/auth";
import { canUseContactFeatures, verifiedAccountRequiredMessage } from "@/lib/account-requirements";
import { errorResponse, json } from "@/lib/http";
import { validateContactMessageSafety } from "@/lib/message-safety";
import { createUserMessageAndNotify, listingCategoryToMessageCategory, messageCategoryLabel } from "@/lib/messages";
import { deliverUserNotice } from "@/lib/notifications";
import { db, newDbId, throwDbError, userSelect } from "@/lib/supabase-db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const interestSchema = z.object({
  question1: z.string().min(3).max(280),
  question2: z.string().max(160).optional(),
  question3: z.string().max(160).optional()
});

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    if (user.accountBlockedAt) return json({ error: "Sua conta está temporariamente impedida de enviar interesses. Entre em contato com o suporte do Achei X." }, 403);
    if (!canUseContactFeatures(user)) return json({ error: verifiedAccountRequiredMessage }, 403);
    const { data: listing, error: listingError } = await db()
      .from("Listing")
      .select("id,slug,title,category,ownerId,contactClickCount")
      .eq("slug", params.slug)
      .maybeSingle();
    throwDbError(listingError);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);
    if (listing.ownerId === user.id) return json({ error: "Você não pode enviar interesse no próprio anúncio." }, 422);

    const { data: owner, error: ownerError } = await db()
      .from("User")
      .select(userSelect())
      .eq("id", listing.ownerId)
      .maybeSingle();
    throwDbError(ownerError);
    if (!owner) return json({ error: "Anunciante não encontrado." }, 404);

    const lead = interestSchema.parse(await request.json());
    const safety = await validateContactMessageSafety({
      request,
      sender: user,
      targetUserId: listing.ownerId,
      message: [lead.question1, lead.question2, lead.question3].filter(Boolean).join("\n"),
      context: { type: "LISTING", listingId: listing.id }
    });
    if (!safety.allowed) return json({ error: safety.message }, safety.status ?? 403);

    const leadId = newDbId();
    const { error: leadError } = await db()
      .from("ContactLead")
      .insert({
        id: leadId,
        listingId: listing.id,
        interestedUserId: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        phone: user.phone ?? user.whatsapp ?? "",
        question1: lead.question1,
        question2: lead.question2 ?? null,
        question3: lead.question3 ?? null
      })
      ;
    throwDbError(leadError);

    const { error: updateError } = await db()
      .from("Listing")
      .update({ contactClickCount: Number(listing.contactClickCount ?? 0) + 1 })
      .eq("id", listing.id);
    throwDbError(updateError);

    const appUrl = getAppBaseUrl(request);
    const listingUrl = `${appUrl}/anuncios/${listing.slug}`;
    const responseUrl = `${appUrl}/dashboard?lead=${leadId}#mensagens`;
    const notificationMessage = [
      `${user.name} demonstrou interesse no anúncio "${listing.title}".`,
      `Mensagem: ${lead.question1}`,
      `Veja e responda pelo Achei X: ${responseUrl}`
    ].join("\n\n");
    await deliverUserNotice(
      owner as any,
      "Novo interessado no seu anúncio",
      notificationMessage,
      {
        linkLabel: listing.title,
        linkUrl: listingUrl,
        primaryActionLabel: "Ver interessado",
        primaryActionUrl: responseUrl,
        contactLeadId: leadId,
        suppressPush: true
      }
    );

    const category = listingCategoryToMessageCategory(listing.category);
    await createUserMessageAndNotify({
      category,
      listingId: listing.id,
      sourceType: "CONTACT_LEAD",
      sourceId: leadId,
      senderId: user.id,
      recipientId: listing.ownerId,
      body: lead.question1,
      push: {
        title: "Nova mensagem no Achei X",
        body: `Você recebeu uma nova mensagem em ${messageCategoryLabel(category)}.`,
        url: responseUrl
      }
    });

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function getAppBaseUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedBaseUrl = forwardedHost
    ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
    : undefined;
  return (process.env.APP_URL || forwardedBaseUrl || "http://localhost:3000").replace(/\/$/, "");
}

