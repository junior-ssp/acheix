import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { revalidateManualListingFeeds } from "@/lib/manual-listing-cache";
import { createManualListing, requireManualListingManager } from "@/lib/manual-listings";
import { manualListingSchema } from "@/lib/manual-listing-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    requireManualListingManager(user);
    const data = manualListingSchema.parse(await request.json());
    const selectedCategories = Array.from(new Set((data.categories.length ? data.categories : [data.category])));
    const manualListings = [];
    for (const category of selectedCategories) {
      const manualListing = await createManualListing({
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
      category,
      durationDays: data.durationDays,
      photos: data.photos
      });
      manualListings.push(manualListing);
    }
    revalidateManualListingFeeds();
    return json({ manualListing: manualListings[0], manualListings }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
