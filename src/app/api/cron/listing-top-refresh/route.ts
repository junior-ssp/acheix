import { nextTopRefreshAt, professionalTopRefreshOwnerCooldownHours, topRefreshBoostUntil } from "@/lib/listing-top-refresh-policy";
import { getSupabaseAdmin } from "@/lib/supabase";
import { newDbId } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

type DueListing = {
  id: string;
  ownerId: string;
  planId: string;
  nextTopRefreshAt: string | null;
};

type PlanRow = {
  id: string;
  code: string;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: dueListings, error } = await supabase
    .from("Listing")
    .select("id,ownerId,planId,nextTopRefreshAt")
    .eq("status", "ACTIVE")
    .gt("expiresAt", nowIso)
    .lte("nextTopRefreshAt", nowIso)
    .order("nextTopRefreshAt", { ascending: true })
    .limit(120);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const listings = (dueListings ?? []) as DueListing[];
  const planIds = [...new Set(listings.map((listing) => listing.planId).filter(Boolean))];
  const { data: plans, error: plansError } = planIds.length
    ? await supabase.from("Plan").select("id,code").in("id", planIds)
    : { data: [], error: null };
  if (plansError) return Response.json({ error: plansError.message }, { status: 400 });

  const planCodeById = new Map((plans ?? []).map((plan: PlanRow) => [plan.id, plan.code]));
  const refreshedOwnerIds = new Set<string>();
  const counters = { refreshed: 0, skippedReports: 0, skippedCooldown: 0, skippedUnknownPlan: 0 };

  for (const listing of listings) {
    const planCode = planCodeById.get(listing.planId);
    if (!planCode) {
      counters.skippedUnknownPlan += 1;
      continue;
    }

    const hasBlockingCase = await hasOpenBlockingTrustCase(listing.id);
    if (hasBlockingCase) {
      counters.skippedReports += 1;
      await scheduleNext(listing.id, planCode, now);
      continue;
    }

    if (refreshedOwnerIds.has(listing.ownerId) || await ownerHadRecentTopRefresh(listing.ownerId, now)) {
      counters.skippedCooldown += 1;
      continue;
    }

    const boostUntil = topRefreshBoostUntil(now);
    const nextRefresh = nextTopRefreshAt(planCode, now);
    const { error: updateError } = await supabase
      .from("Listing")
      .update({
        lastTopRefreshAt: nowIso,
        topRefreshBoostUntil: boostUntil.toISOString(),
        nextTopRefreshAt: nextRefresh.toISOString(),
        updatedAt: nowIso
      })
      .eq("id", listing.id)
      .eq("status", "ACTIVE")
      .lte("nextTopRefreshAt", nowIso);
    if (updateError) return Response.json({ error: updateError.message }, { status: 400 });

    const { error: auditError } = await supabase.from("AuditLog").insert({
      id: newDbId(),
      userId: listing.ownerId,
      action: "listing.top_refresh.applied",
      metadata: {
        listingId: listing.id,
        ownerId: listing.ownerId,
        planCode,
        nextTopRefreshAt: nextRefresh.toISOString(),
        topRefreshBoostUntil: boostUntil.toISOString()
      }
    });
    if (auditError) return Response.json({ error: auditError.message }, { status: 400 });

    refreshedOwnerIds.add(listing.ownerId);
    counters.refreshed += 1;
  }

  return Response.json({ ok: true, counters });

  async function hasOpenBlockingTrustCase(listingId: string) {
    const { count, error: caseError } = await supabase
      .from("TrustCase")
      .select("id", { count: "exact", head: true })
      .eq("targetType", "LISTING")
      .eq("listingId", listingId)
      .in("status", ["MONITORING", "NEEDS_REVIEW", "PREVENTIVE_ACTION"]);
    if (caseError) throw caseError;
    return Number(count ?? 0) > 0;
  }

  async function ownerHadRecentTopRefresh(ownerId: string, reference: Date) {
    const since = new Date(reference.getTime() - professionalTopRefreshOwnerCooldownHours * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("Listing")
      .select("id", { count: "exact", head: true })
      .eq("ownerId", ownerId)
      .gte("lastTopRefreshAt", since);
    if (countError) throw countError;
    return Number(count ?? 0) > 0;
  }

  async function scheduleNext(listingId: string, planCode: string, reference: Date) {
    const { error: updateError } = await supabase
      .from("Listing")
      .update({ nextTopRefreshAt: nextTopRefreshAt(planCode, reference).toISOString(), topRefreshBoostUntil: null, updatedAt: nowIso })
      .eq("id", listingId);
    if (updateError) throw updateError;
  }
}
