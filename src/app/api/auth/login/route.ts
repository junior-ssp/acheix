import { setAdminSessionCookie, setSessionCookie, signAdminSession, signSession, verifyPassword } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { nextServiceConfirmationDue } from "@/lib/service-profile-activity-policy";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSupabaseAuthClient } from "@/lib/supabase-auth";
import { db, throwDbError } from "@/lib/supabase-db";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = loginSchema.parse(body);
    const email = data.email.toLowerCase();
    const wantsAdminSession = isAdminNextPath(typeof body?.nextPath === "string" ? body.nextPath : undefined);
    const rememberLogin = !wantsAdminSession && (body?.remember === true || body?.remember === "true");
    const { data: account, error } = await db()
      .from("User")
      .select("id,name,email,emailVerifiedAt,role,passwordHash,supabaseUid,accountBlockedAt")
      .eq("email", email)
      .maybeSingle();
    throwDbError(error);

    const passwordOk = account ? await verifyPassword(data.password, account.passwordHash) : false;
    if (!account || !passwordOk) {
      return json({ error: "Credenciais inválidas" }, 401);
    }

    if (wantsAdminSession && account.role !== "ADMIN") {
      return json({ error: "Este login não tem permissão de administrador." }, 403);
    }
    if (!wantsAdminSession && account.accountBlockedAt) {
      return json({ error: "Conta suspensa. Entre em contato com o suporte." }, 403);
    }

    const supabase = getSupabaseAuthClient();
    const authResult = supabase
      ? await supabase.auth.signInWithPassword({ email, password: data.password })
      : null;

    const supabaseUid = authResult?.data.user?.id;
    const accountUpdates: Record<string, string> = {};
    if (supabaseUid && !account.supabaseUid) accountUpdates.supabaseUid = supabaseUid;
    const emailAutoValidated = !account.emailVerifiedAt;
    if (emailAutoValidated) accountUpdates.emailVerifiedAt = new Date().toISOString();
    if (Object.keys(accountUpdates).length) {
      const { error: updateError } = await db().from("User").update(accountUpdates).eq("id", account.id);
      throwDbError(updateError);
    }

    await markServiceProfileLoginActivity(account.id).catch(() => undefined);

    setSessionCookie(signSession({ userId: account.id, role: account.role }), { remember: rememberLogin });
    if (wantsAdminSession) {
      setAdminSessionCookie(signAdminSession({ userId: account.id, role: "ADMIN" }));
    }

    return json({ user: { id: account.id, name: account.name, email: account.email, role: account.role }, adminSession: wantsAdminSession, emailAutoValidated });
  } catch (error) {
    return errorResponse(error);
  }
}

async function markServiceProfileLoginActivity(userId: string) {
  const now = new Date();
  await getSupabaseAdmin()
    .from("service_profiles")
    .update({
      status: "ACTIVE",
      active: true,
      last_active_at: now.toISOString(),
      activity_confirmation_due_at: nextServiceConfirmationDue(now).toISOString(),
      updated_at: now.toISOString()
    })
    .eq("user_id", userId)
    .not("status", "in", "(PAUSED,CLOSED)");
}

function isAdminNextPath(value?: string) {
  return value === "/admin" || Boolean(value?.startsWith("/admin/"));
}
