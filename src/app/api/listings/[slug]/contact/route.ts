import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { sendInboxPushNotification } from "@/lib/inbox-push";
import { validateContactMessageSafety } from "@/lib/message-safety";
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
    if (user.accountBlockedAt) return json({ error: "Sua conta está temporariamente impedida de enviar mensagens. Entre em contato com o suporte do Achei X." }, 403);
    const { data: listing, error: listingError } = await db()
      .from("Listing")
      .select("id,slug,title,ownerId,contactClickCount")
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
    const responseUrl = `${appUrl}/mensagens?lead=${leadId}`;
    await deliverUserNotice(
      owner as any,
      "Novo interessado no seu anúncio",
      `${user.name} demonstrou interesse. Responda o mais breve possível para manter sua avaliação sempre melhor e para não deixar o interessado aguardando muito tempo.`,
      {
        linkLabel: listing.title,
        linkUrl: listingUrl,
        primaryActionLabel: "Responder agora",
        primaryActionUrl: responseUrl,
        contactLeadId: leadId
      }
    );

    await sendInboxPushNotification(listing.ownerId, {
      title: "Nova mensagem",
      body: `Você recebeu uma mensagem sobre ${listing.title}.`,
      url: responseUrl,
      leadId: leadId,
      listingTitle: listing.title
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

