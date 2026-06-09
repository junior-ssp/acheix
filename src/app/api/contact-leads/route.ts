import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { deliverUserNotice } from "@/lib/notifications";
import { db, throwDbError, userSelect } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const user = await requireUser();
    const leads = await findOwnedLeads(user.id);

    await Promise.all(leads.map((lead) => {
      if (!lead.interestedUser) return Promise.resolve();
      return deliverUserNotice(
        lead.interestedUser,
        "Resposta do anunciante",
        "O Anunciante agradece seu contato e pede para avisar que desistiu de seguir com a Negociação. Sugerimos continue buscando conosco. Obrigado !!!",
        { linkLabel: lead.listing.title, linkUrl: `/anuncios/${lead.listing.slug}`, primaryActionLabel: "Continuar buscando", primaryActionUrl: "/buscar", contactLeadId: lead.id }
      );
    }));

    const ids = leads.map((lead) => lead.id);
    if (ids.length) {
      const { error } = await db().from("ContactLead").delete().in("id", ids);
      throwDbError(error);
    }
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

async function findOwnedLeads(ownerId: string) {
  const { data: listings, error: listingsError } = await db().from("Listing").select("id,title,slug").eq("ownerId", ownerId);
  throwDbError(listingsError);
  const listingRows = (listings ?? []) as Array<{ id: string; title: string; slug: string }>;
  const listingById = new Map(listingRows.map((listing) => [listing.id, listing]));
  const listingIds = [...listingById.keys()];
  if (!listingIds.length) return [];

  const { data: leads, error } = await db().from("ContactLead").select("id,listingId,interestedUserId").in("listingId", listingIds);
  throwDbError(error);
  const leadRows = (leads ?? []) as Array<any>;
  const interestedIds = [...new Set(leadRows.map((lead) => lead.interestedUserId).filter(Boolean))];
  const { data: users, error: usersError } = interestedIds.length
    ? await db().from("User").select(userSelect()).in("id", interestedIds)
    : { data: [], error: null };
  throwDbError(usersError);
  const userRows = (users ?? []) as Array<any>;
  const userById = new Map(userRows.map((item) => [item.id, item]));

  return leadRows.map((lead) => ({ ...lead, listing: listingById.get(lead.listingId), interestedUser: lead.interestedUserId ? userById.get(lead.interestedUserId) : null })).filter((lead) => lead.listing);
}

