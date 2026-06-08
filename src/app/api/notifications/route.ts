import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const [{ data: notifications, error }, { count: unreadCount, error: countError }] = await Promise.all([
      db().from("Notification").select("*").eq("userId", user.id).is("readAt", null).order("createdAt", { ascending: false }).limit(5),
      db().from("Notification").select("id", { count: "exact", head: true }).eq("userId", user.id).is("readAt", null)
    ]);
    throwDbError(error);
    throwDbError(countError);
    return json({ notifications: notifications ?? [], unreadCount: unreadCount ?? 0 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const data = await request.json().catch(() => ({}));
    const id = typeof data.id === "string" ? data.id : undefined;
    if (!id) return json({ error: "Notificação inválida" }, 422);
    const { error } = await db().from("Notification").update({ readAt: new Date().toISOString() }).eq("id", id).eq("userId", user.id);
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
