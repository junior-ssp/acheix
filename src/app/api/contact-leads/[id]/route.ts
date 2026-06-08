import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { deliverUserNotice } from "@/lib/notifications";
import { db, throwDbError, userSelect } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({ status: z.enum(["READ", "WILL_CONTACT", "IGNORED", "SOLD", "RENTED"]) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const data = decisionSchema.parse(await request.json());
    const lead = await findOwnedLead(params.id, user.id);
    if (!lead) return json({ error: "Interesse não encontrado" }, 404);
    const now = new Date().toISOString();
    const { data: updated, error } = await db()
      .from("ContactLead")
      .update({ status: data.status, readAt: now, decidedAt: data.status === "READ" ? null : now })
      .eq("id", params.id)
      .select("*")
      .single();
    throwDbError(error);

    if (data.status === "SOLD" || data.status === "RENTED") {
      const { error: listingUpdateError } = await db()
        .from("Listing")
        .update({ status: data.status, updatedAt: now })
        .eq("id", lead.listing.id);
      throwDbError(listingUpdateError);

      if (lead.interestedUser) {
        const message = data.status === "SOLD"
          ? "Já vendi, agradeço muito seu contato. Continue buscando no Achei X; espero que encontre uma ótima oportunidade. Grato."
          : "Já aluguei, agradeço muito seu contato. Continue buscando no Achei X; espero que encontre uma ótima oportunidade. Grato.";
        await deliverUserNotice(
          lead.interestedUser,
          "Resposta do anunciante",
          message,
          { linkLabel: lead.listing.title, linkUrl: `/anuncios/${lead.listing.slug}`, primaryActionLabel: "Continuar buscando", primaryActionUrl: "/buscar", contactLeadId: lead.id }
        );
      }
    }

    return json({ lead: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const lead = await findOwnedLead(params.id, user.id);
    if (!lead) return json({ error: "Interesse não encontrado" }, 404);

    if (lead.interestedUser) {
      await deliverUserNotice(
        lead.interestedUser,
        "Resposta do anunciante",
        "O Anunciante agradece seu contato e pede para avisar que desistiu de seguir com a Negociação. Sugerimos continue buscando conosco. Obrigado !!!",
        { linkLabel: lead.listing.title, linkUrl: `/anuncios/${lead.listing.slug}`, primaryActionLabel: "Continuar buscando", primaryActionUrl: "/buscar", contactLeadId: lead.id }
      );
    }

    const { error } = await db().from("ContactLead").delete().eq("id", lead.id);
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

async function findOwnedLead(id: string, ownerId: string) {
  const { data: lead, error } = await db().from("ContactLead").select("*").eq("id", id).maybeSingle();
  throwDbError(error);
  if (!lead) return null;
  const { data: listing, error: listingError } = await db().from("Listing").select("id,title,slug,ownerId").eq("id", lead.listingId).maybeSingle();
  throwDbError(listingError);
  if (!listing || listing.ownerId !== ownerId) return null;
  const { data: interestedUser, error: userError } = lead.interestedUserId
    ? await db().from("User").select(userSelect()).eq("id", lead.interestedUserId).maybeSingle()
    : { data: null, error: null };
  throwDbError(userError);
  return { ...(lead as any), listing: listing as any, interestedUser: interestedUser as any };
}

