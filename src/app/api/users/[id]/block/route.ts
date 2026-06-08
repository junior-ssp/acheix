import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.id === params.id) return json({ error: "Você não pode bloquear sua própria conta." }, 422);

    const { data: target, error: targetError } = await db()
      .from("User")
      .select("id,name,email")
      .eq("id", params.id)
      .maybeSingle();
    throwDbError(targetError);
    if (!target) return json({ error: "Usuário não encontrado." }, 404);

    const { data: existing, error: existingError } = await db()
      .from("AuditLog")
      .select("id")
      .eq("userId", user.id)
      .eq("action", "user.blocked")
      .contains("metadata", { blockedUserId: target.id })
      .maybeSingle();
    throwDbError(existingError);

    if (!existing) {
      const { error: auditError } = await db().from("AuditLog").insert({
        id: newDbId(),
        userId: user.id,
        action: "user.blocked",
        metadata: { blockedUserId: target.id, blockedUserName: target.name }
      });
      throwDbError(auditError);
    }

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
