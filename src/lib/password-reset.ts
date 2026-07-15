import { createHash, randomBytes } from "crypto";
import { getPublicAppBaseUrl } from "@/lib/app-url";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/notifications";
import { getSupabaseAdminClient } from "@/lib/supabase-auth";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

const requestAction = "auth.password_reset.requested";
const usedAction = "auth.password_reset.used";
const expiresInMinutes = 30;

type ResetMetadata = {
  tokenHash?: string;
  email?: string;
  expiresAt?: string;
};

export async function requestPasswordReset(email: string, request?: Request) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: user, error } = await db()
    .from("User")
    .select("id,name,email")
    .eq("email", normalizedEmail)
    .maybeSingle();
  throwDbError(error);

  if (!user) {
    await writeAuditLog(null, "auth.password_reset.unknown_email", { email: normalizedEmail });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const resetUrl = `${getPublicAppBaseUrl(request)}/redefinir-senha?token=${encodeURIComponent(token)}`;

  await writeAuditLog(user.id, requestAction, {
    email: normalizedEmail,
    tokenHash,
    expiresAt
  });

  await sendEmail(
    normalizedEmail,
    "Recuperação de senha do Achei X",
    [
      `Olá, ${user.name ?? "usuário"}.`,
      "",
      "Recebemos uma solicitação para redefinir sua senha no Achei X.",
      `Acesse este link para criar uma nova senha: ${resetUrl}`,
      "",
      `Este link vence em ${expiresInMinutes} minutos.`,
      "Se você não solicitou essa recuperação, ignore este e-mail."
    ].join("\n")
  );
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const tokenHash = hashResetToken(token);
  const resetRequest = await findValidResetRequest(tokenHash);

  if (!resetRequest) {
    throw new Error("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
  }

  const { data: user, error: userError } = await db()
    .from("User")
    .select("id,email,supabaseUid")
    .eq("id", resetRequest.userId)
    .maybeSingle();
  throwDbError(userError);

  if (!user) {
    throw new Error("Conta não encontrada. Solicite uma nova recuperação de senha.");
  }

  const passwordHash = await hashPassword(newPassword);
  const { error: updateError } = await db()
    .from("User")
    .update({ passwordHash })
    .eq("id", user.id);
  throwDbError(updateError);

  if (user.supabaseUid) {
    const authError = await getSupabaseAdminClient()
      ?.auth.admin.updateUserById(user.supabaseUid, { password: newPassword })
      .then((result) => result.error)
      .catch((error) => error);
    if (authError) {
      await writeAuditLog(user.id, "auth.password_reset.supabase_update_failed", {
        tokenHash,
        message: String(authError?.message ?? authError)
      });
    }
  }

  await writeAuditLog(user.id, usedAction, {
    tokenHash,
    email: user.email,
    requestId: resetRequest.id,
    usedAt: new Date().toISOString()
  });
}

async function findValidResetRequest(tokenHash: string) {
  const { data: usedRows, error: usedError } = await db()
    .from("AuditLog")
    .select("id,metadata")
    .eq("action", usedAction)
    .order("createdAt", { ascending: false })
    .limit(100);
  throwDbError(usedError);

  const alreadyUsed = (usedRows ?? []).some((row: any) => {
    const metadata = row.metadata as ResetMetadata | null;
    return metadata?.tokenHash === tokenHash;
  });
  if (alreadyUsed) return null;

  const { data, error } = await db()
    .from("AuditLog")
    .select("id,userId,metadata,createdAt")
    .eq("action", requestAction)
    .order("createdAt", { ascending: false })
    .limit(100);
  throwDbError(error);

  const now = Date.now();
  return (data ?? []).find((row: any) => {
    const metadata = row.metadata as ResetMetadata | null;
    if (metadata?.tokenHash !== tokenHash) return false;
    if (!metadata.expiresAt) return false;
    return new Date(metadata.expiresAt).getTime() > now;
  }) as { id: string; userId: string; metadata: ResetMetadata } | undefined;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function writeAuditLog(userId: string | null, action: string, metadata: Record<string, unknown>) {
  const { error } = await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
  throwDbError(error);
}
