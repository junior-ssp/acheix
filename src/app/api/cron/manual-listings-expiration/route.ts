import { deleteExpiredManualListings, refreshManualListingTopPositions } from "@/lib/manual-listings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  await refreshManualListingTopPositions();
  const deleted = await deleteExpiredManualListings();
  return Response.json({ ok: true, deleted });
}
