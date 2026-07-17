import { requireUser } from "@/lib/auth";
import { findBannerCampaign } from "@/lib/banner-campaigns";
import { errorResponse, json } from "@/lib/http";
import { parseBannerProviderRef, parsePublishProviderRef, parseRenewProviderRef, parseServiceProviderRef } from "@/lib/payments";
import { reconcileAsaasPayment } from "@/lib/payment-reconciliation";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

type PaymentStatusRow = {
  id: string;
  status: string;
  amountCents: number;
  providerRef: string | null;
};

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { data: paymentRow, error } = await db()
      .from("Payment")
      .select("id,status,amountCents,providerRef")
      .eq("id", params.id)
      .eq("userId", user.id)
      .maybeSingle();
    throwDbError(error);
    if (!paymentRow) return json({ error: "Pagamento não encontrado." }, 404);

    const reconciliation = await reconcileAsaasPayment(paymentRow as PaymentStatusRow).catch(() => ({ status: "unavailable" as const, payment: paymentRow as PaymentStatusRow }));
    const payment = { ...(paymentRow as PaymentStatusRow), status: reconciliation.payment.status };

    const publish = parsePublishProviderRef(payment.providerRef);
    const renew = parseRenewProviderRef(payment.providerRef);
    const service = parseServiceProviderRef(payment.providerRef);
    const banner = parseBannerProviderRef(payment.providerRef);
    const listingId = publish?.listingId ?? renew?.listingId;
    const { data: listing, error: listingError } = listingId
      ? await db().from("Listing").select("slug,title,status").eq("id", listingId).maybeSingle()
      : { data: null, error: null };
    throwDbError(listingError);

    const { data: serviceProfile, error: serviceError } = service?.profileId
      ? await db().from("service_profiles").select("id,name,nome_fantasia,status").eq("id", service.profileId).maybeSingle()
      : { data: null, error: null };
    throwDbError(serviceError);

    const bannerCampaign = banner?.campaignId ? await findBannerCampaign(banner.campaignId, user.id) : null;

    return json({
      payment: { id: payment.id, status: payment.status },
      listing: listing ? { slug: listing.slug, title: listing.title, status: listing.status } : null,
      service: serviceProfile ? { id: serviceProfile.id, title: serviceProfile.nome_fantasia ?? serviceProfile.name ?? "Prestador", status: serviceProfile.status } : null,
      banner: bannerCampaign ? { id: bannerCampaign.campaignId, title: bannerCampaign.campaignTitle, status: bannerCampaign.status } : null
    });
  } catch (error) {
    return errorResponse(error);
  }
}
