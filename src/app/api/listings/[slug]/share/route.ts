import { shareChannels } from "@/lib/constants";
import { errorResponse, json } from "@/lib/http";
import { getPublicAppBaseUrl } from "@/lib/app-url";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const { channel } = await request.json();
    if (!shareChannels.includes(channel)) return json({ error: "Canal inválido" }, 422);
    const { data: listing, error: listingError } = await db()
      .from("Listing")
      .select("id,shareCount")
      .eq("slug", params.slug)
      .maybeSingle();
    throwDbError(listingError);
    if (!listing) return json({ error: "Anúncio não encontrado." }, 404);

    const [{ error: shareError }, { error: updateError }] = await Promise.all([
      db().from("Share").insert({ id: newDbId(), listingId: listing.id, channel }),
      db().from("Listing").update({ shareCount: Number(listing.shareCount ?? 0) + 1 }).eq("id", listing.id)
    ]);
    throwDbError(shareError);
    throwDbError(updateError);
    return json({ url: `${getPublicAppBaseUrl(request)}/s/${params.slug}` });
  } catch (error) {
    return errorResponse(error);
  }
}
