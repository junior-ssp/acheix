import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";
import { reconcilePendingAsaasPaymentsForUser } from "@/lib/payment-reconciliation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    await reconcilePendingAsaasPaymentsForUser(user.id).catch(() => null);
    const { data: listings, error } = await db()
      .from("Listing")
      .select("*,plan:Plan(*)")
      .eq("ownerId", user.id);
    throwDbError(error);

    const listingRows = listings ?? [];
    const listingIds = listingRows.map((item) => item.id).filter(Boolean);
    const [{ count: favorited, error: favError }, { count: renewals, error: renewError }] = await Promise.all([
      listingIds.length ? db().from("Favorite").select("id", { count: "exact", head: true }).in("listingId", listingIds) : Promise.resolve({ count: 0, error: null }),
      listingIds.length ? db().from("Subscription").select("id", { count: "exact", head: true }).in("listingId", listingIds) : Promise.resolve({ count: 0, error: null })
    ]);
    throwDbError(favError);
    throwDbError(renewError);

    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).getTime();
    return json({
      metrics: {
        active: listingRows.filter((item) => item.status === "ACTIVE").length,
        expiring: listingRows.filter((item) => new Date(item.expiresAt).getTime() <= threeDaysFromNow).length,
        expired: listingRows.filter((item) => item.status === "EXPIRED").length,
        favorited: favorited ?? 0,
        views: listingRows.reduce((sum, item) => sum + Number(item.viewCount ?? 0), 0),
        clicks: listingRows.reduce((sum, item) => sum + Number(item.contactClickCount ?? 0), 0),
        shares: listingRows.reduce((sum, item) => sum + Number(item.shareCount ?? 0), 0),
        renewals: renewals ?? 0
      },
      listings: listingRows
    });
  } catch (error) {
    return errorResponse(error);
  }
}
