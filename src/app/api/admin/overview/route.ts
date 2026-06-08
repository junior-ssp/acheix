import { requireAdmin } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const [users, listings, pendingListings, payments] = await Promise.all([
      countRows("User"),
      countRows("Listing"),
      countRows("Listing", { column: "status", value: "PENDING_REVIEW" }),
      countRows("Payment")
    ]);
    return json({ users, listings, pendingListings, payments });
  } catch (error) {
    return errorResponse(error);
  }
}

async function countRows(table: string, filter?: { column: string; value: string }) {
  let query = db().from(table).select("id", { count: "exact", head: true });
  if (filter) query = query.eq(filter.column, filter.value);
  const { count, error } = await query;
  throwDbError(error);
  return count ?? 0;
}
