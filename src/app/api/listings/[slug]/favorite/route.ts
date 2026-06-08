import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

async function findListingId(slug: string) {
  const { data, error } = await db().from("Listing").select("id").eq("slug", slug).maybeSingle();
  throwDbError(error);
  if (!data) throw new Response("Not Found", { status: 404 });
  return data.id as string;
}

export async function POST(_: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listingId = await findListingId(params.slug);
    const { error } = await db()
      .from("Favorite")
      .upsert({ id: newDbId(), userId: user.id, listingId }, { onConflict: "userId,listingId", ignoreDuplicates: true });
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await requireUser();
    const listingId = await findListingId(params.slug);
    const { error } = await db().from("Favorite").delete().eq("userId", user.id).eq("listingId", listingId);
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
