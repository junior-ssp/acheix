import { setAdminSessionCookie, setSessionCookie, signAdminSession, signSession, verifyPassword } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { nextServiceConfirmationDue } from "@/lib/service-profile-activity-policy";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "@/lib/supabase-auth";
import { db, throwDbError } from "@/lib/supabase-db";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = loginSchema.parse(body);
    const email = data.email.toLowerCase();
    const wantsAdminSession = isAdminNextPath(typeof body?.nextPath === "string" ? body.nextPath : undefined);
    const { data: account, error } = await db()
      .from("User")
      .select("id,name,email,role,passwordHash,supabaseUid")
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

    const supabase = getSupabaseAuthClient();
    let authResult = supabase
      ? await supabase.auth.signInWithPassword({ email, password: data.password })
      : null;

    if (supabase && authResult?.error && account.supabaseUid && isEmailNotConfirmed(authResult.error.message)) {
      await getSupabaseAdminClient()?.auth.admin.updateUserById(account.supabaseUid, { email_confirm: true }).catch(() => null);
      authResult = await supabase.auth.signInWithPassword({ email, password: data.password });
    }

    const supabaseUid = authResult?.data.user?.id;
    if (supabaseUid && !account.supabaseUid) {
      const { error: updateError } = await db().from("User").update({ supabaseUid }).eq("id", account.id);
      throwDbError(updateError);
    }

    await markServiceProfileLoginActivity(account.id).catch(() => undefined);

    setSessionCookie(signSession({ userId: account.id, role: account.role }));
    if (wantsAdminSession) {
      setAdminSessionCookie(signAdminSession({ userId: account.id, role: "ADMIN" }));
    }

    return json({ user: { id: account.id, name: account.name, email: account.email, role: account.role }, adminSession: wantsAdminSession });
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

function isEmailNotConfirmed(message?: string) {
  const text = message?.toLowerCase() ?? "";
  return text.includes("email not confirmed") || text.includes("not confirmed") || text.includes("confirm");
}
