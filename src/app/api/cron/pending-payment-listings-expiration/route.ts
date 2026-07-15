import { pendingPaymentDraftDays } from "@/lib/expiration-policy";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - pendingPaymentDraftDays * 86400000).toISOString();
  const { data: expiredDrafts, error } = await db()
    .from("Listing")
    .select("id,slug,title,ownerId,createdAt,expiresAt")
    .eq("status", "DRAFT")
    .lte("createdAt", cutoff)
    .order("createdAt", { ascending: true })
    .limit(100);
  throwDbError(error);

  const listings = (expiredDrafts ?? []) as Array<{ id: string; slug: string; title: string; ownerId: string; createdAt: string; expiresAt: string | null }>;
  const nowIso = now.toISOString();
  for (const listing of listings) {
    const { error: paymentError } = await db()
      .from("Payment")
      .update({ status: "FAILED", updatedAt: nowIso })
      .eq("status", "PENDING")
      .like("providerRef", `publish:${listing.id}:%`);
    throwDbError(paymentError);
  }

  if (listings.length) {
    const { error: deleteError } = await db().from("Listing").delete().in("id", listings.map((listing) => listing.id));
    throwDbError(deleteError);
  }

  return Response.json({
    ok: true,
    deleted: listings.length,
    pendingPaymentDraftDays,
    cutoff
  });
}
