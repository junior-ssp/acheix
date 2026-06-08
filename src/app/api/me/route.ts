import { clearSessionCookie, getCurrentUser, requireUser } from "@/lib/auth";
import { completeLocationFromUserAndDdd } from "@/lib/ddd-autocomplete";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { getSupabaseAdminClient } from "@/lib/supabase-auth";
import { db, isUniqueViolation, throwDbError } from "@/lib/supabase-db";
import { profileSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return json({ user });
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const data = profileSchema.parse(await request.json());
    const username = data.username || null;
    const phone = data.phone ? onlyDigits(data.phone) : null;
    const whatsapp = data.whatsapp ? onlyDigits(data.whatsapp) : null;
    const location = await completeLocationFromUserAndDdd({ cep: data.cep, state: data.state, city: data.city, district: data.district }, {
      cep: user.cep,
      state: user.state,
      city: user.city,
      district: user.district,
      phone: whatsapp || phone || user.whatsapp || user.phone,
      whatsapp: whatsapp || user.whatsapp
    });

    if (username) {
      const { data: existingUsername, error: usernameError } = await db()
        .from("User")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();
      throwDbError(usernameError);
      if (existingUsername) return json({ error: "Este username já está em uso. Escolha outro." }, 409);
    }

    const { data: updated, error } = await db()
      .from("User")
      .update({
        name: data.name,
        username,
        phone,
        whatsapp,
        cep: data.cep ? onlyDigits(data.cep) : null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        district: location.district || null,
        city: location.city || null,
        state: location.state || null
      })
      .eq("id", user.id)
      .select("name,username,phone,whatsapp,cep,address,number,complement,district,city,state")
      .single();
    throwDbError(error);

    return json({ user: updated });
  } catch (error) {
    if (isUniqueViolation(error)) return json({ error: "Este username já está em uso. Escolha outro." }, 409);
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    const { data: account, error: findError } = await db()
      .from("User")
      .select("id,supabaseUid")
      .eq("id", user.id)
      .maybeSingle();
    throwDbError(findError);
    if (!account) return json({ error: "Conta não encontrada." }, 404);

    const { error: deleteError } = await db().from("User").delete().eq("id", account.id);
    throwDbError(deleteError);
    if (account.supabaseUid) {
      await getSupabaseAdminClient()?.auth.admin.deleteUser(account.supabaseUid).catch(() => null);
    }
    clearSessionCookie();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}


