import { requireAdmin } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const verifiedAt = new Date().toISOString();
    const { data: user, error: userError } = await db()
      .from("User")
      .update({
        cpfVerifiedAt: verifiedAt,
        phoneVerifiedAt: verifiedAt,
        whatsappVerifiedAt: verifiedAt,
        identityVerifiedAt: verifiedAt,
        verificationProvider: "manual_admin",
        updatedAt: verifiedAt
      })
      .eq("id", params.id)
      .select("id,name,identityVerifiedAt")
      .single();
    throwDbError(userError);
    if (!user) return json({ error: "Usuário não encontrado." }, 404);

    const { error: auditError } = await db().from("AuditLog").insert({
      id: newDbId(),
      userId: admin.id,
      action: "user.identity_verified",
      metadata: { verifiedUserId: user.id, verifiedUserName: user.name, verifiedAt }
    });
    throwDbError(auditError);

    return json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}

