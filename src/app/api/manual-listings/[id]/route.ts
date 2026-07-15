import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { revalidateManualListingFeeds } from "@/lib/manual-listing-cache";
import { deleteManualListing, requireManualListingManager, updateManualListing } from "@/lib/manual-listings";
import { manualListingSchema } from "@/lib/manual-listing-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireManualListingManager(user);
    const data = manualListingSchema.parse(await request.json());
    const manualListing = await updateManualListing({
      id: params.id,
      ownerId: user.id,
      title: data.title,
      address: data.address,
      priceCents: data.priceCents,
      phone: data.phone,
      tollFree: data.tollFree,
      whatsapp: data.whatsapp,
      whatsapp2: data.whatsapp2,
      website: data.website,
      facebook: data.facebook,
      instagram: data.instagram,
      youtube: data.youtube,
      tiktok: data.tiktok,
      vidiu: data.vidiu,
      category: data.category,
      durationDays: data.durationDays,
      photos: data.photos
    });
    if (!manualListing) return json({ error: "Anúncio não encontrado." }, 404);
    revalidateManualListingFeeds();
    return json({ manualListing });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    requireManualListingManager(user);
    await deleteManualListing(params.id, user.id);
    revalidateManualListingFeeds();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
