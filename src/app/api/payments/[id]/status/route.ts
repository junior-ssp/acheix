import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { parsePublishProviderRef, parseRenewProviderRef, parseServiceProviderRef } from "@/lib/payments";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { data: payment, error } = await db()
      .from("Payment")
      .select("id,status,providerRef")
      .eq("id", params.id)
      .eq("userId", user.id)
      .maybeSingle();
    throwDbError(error);
    if (!payment) return json({ error: "Pagamento não encontrado." }, 404);

    const publish = parsePublishProviderRef(payment.providerRef);
    const renew = parseRenewProviderRef(payment.providerRef);
    const service = parseServiceProviderRef(payment.providerRef);
    const listingId = publish?.listingId ?? renew?.listingId;
    const { data: listing, error: listingError } = listingId
      ? await db().from("Listing").select("slug,title,status").eq("id", listingId).maybeSingle()
      : { data: null, error: null };
    throwDbError(listingError);

    const { data: serviceProfile, error: serviceError } = service?.profileId
      ? await db().from("service_profiles").select("id,name,nome_fantasia,status").eq("id", service.profileId).maybeSingle()
      : { data: null, error: null };
    throwDbError(serviceError);

    return json({
      payment: { id: payment.id, status: payment.status },
      listing: listing ? { slug: listing.slug, title: listing.title, status: listing.status } : null,
      service: serviceProfile ? { id: serviceProfile.id, title: serviceProfile.nome_fantasia ?? serviceProfile.name ?? "Prestador", status: serviceProfile.status } : null
    });
  } catch (error) {
    return errorResponse(error);
  }
}
