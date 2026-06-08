import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { deliverUserNotice } from "@/lib/notifications";
import { db, throwDbError, userSelect } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({ status: z.enum(["READ", "WILL_CONTACT", "IGNORED"]) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const data = decisionSchema.parse(await request.json());
    const lead = await findOwnedLead(params.id, user.id);
    if (!lead) return json({ error: "Mensagem não encontrada" }, 404);
    const now = new Date().toISOString();
    const { data: updated, error } = await db()
      .from("ContactLead")
      .update({ status: data.status, readAt: now, decidedAt: data.status === "WILL_CONTACT" || data.status === "IGNORED" ? now : null })
      .eq("id", params.id)
      .select("*")
      .single();
    throwDbError(error);
    return json({ lead: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const lead = await findOwnedLead(params.id, user.id);
    if (!lead) return json({ error: "Mensagem não encontrada" }, 404);

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

