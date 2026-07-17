import { clearSessionCookie, getCurrentUser, requireUser } from "@/lib/auth";
import { validateCpfWithProviders } from "@/lib/cpf-validation";
import { canShareCpfBetween } from "@/lib/cpf-sharing-exceptions";
import { completeLocationFromUserAndDdd } from "@/lib/ddd-autocomplete";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { identityNameMatches, identityNameMismatchMessage } from "@/lib/identity-name-match";
import { getSupabaseAdminClient } from "@/lib/supabase-auth";
import { db, isUniqueViolation, throwDbError, uniqueViolationFields } from "@/lib/supabase-db";
import { isValidCnpj, isValidCpf, profileSchema } from "@/lib/validators";
import { reconcilePendingAsaasPaymentsForUser } from "@/lib/payment-reconciliation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (user) await reconcilePendingAsaasPaymentsForUser(user.id).catch(() => null);
  return json({ user });
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const data = profileSchema.parse(await request.json());
    const username = data.username || null;
    const cpf = data.cpf !== undefined ? onlyDigits(data.cpf) : user.cpf;
    const cnpj = data.cnpj !== undefined ? onlyDigits(data.cnpj) : user.cnpj;
    const phone = data.phone ? onlyDigits(data.phone) : null;
    const whatsapp = data.whatsapp ? onlyDigits(data.whatsapp) : null;
    const whatsapp2 = data.whatsapp2 ? onlyDigits(data.whatsapp2) : null;
    const cpfChanged = cpf !== user.cpf;
    const cnpjChanged = cnpj !== user.cnpj;
    const phoneChanged = phone !== user.phone;
    const whatsappChanged = whatsapp !== user.whatsapp;
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

    if (user.accountType === "CPF" && !isValidCpf(cpf ?? "")) {
      return json({ error: "Informe um CPF válido para continuar com pagamentos pelo Asaas." }, 422);
    }
    if (user.accountType === "CPF" && user.cpf && cpfChanged) {
      return json({ error: "Para alterar CPF, envie documento com foto e selfie para análise do Admin." }, 403);
    }
    if (user.accountType === "CPF" && cpf && (cpfChanged || data.name.trim() !== String(user.name ?? "").trim())) {
      const cpfValidation = await validateCpfWithProviders(cpf);
      if (!cpfValidation.valid) {
        return json({ error: cpfValidation.error ?? "Informe um CPF válido." }, 422);
      }
      if (cpfValidation.name && !identityNameMatches(data.name, cpfValidation.name)) {
        return json({ error: identityNameMismatchMessage() }, 422);
      }
    }
    if (user.accountType === "CNPJ" && !isValidCnpj(cnpj ?? "")) {
      return json({ error: "Informe um CNPJ válido para continuar com pagamentos pelo Asaas." }, 422);
    }

    if (cpfChanged && cpf) {
      const { data: existingCpf, error: cpfError } = await db()
        .from("User")
        .select("id,email")
        .eq("cpf", cpf)
        .neq("id", user.id);
      throwDbError(cpfError);
      const blockedDuplicate = (existingCpf ?? []).find((item) => !canShareCpfBetween(user.email, item.email));
      if (blockedDuplicate) return json({ error: "Este CPF já está cadastrado em outra conta." }, 409);
    }

    if (cnpjChanged && cnpj) {
      const { data: existingCnpj, error: cnpjError } = await db()
        .from("User")
        .select("id")
        .eq("cnpj", cnpj)
        .neq("id", user.id)
        .maybeSingle();
      throwDbError(cnpjError);
      if (existingCnpj) return json({ error: "Este CNPJ já está cadastrado em outra conta." }, 409);
    }

    const { data: updated, error } = await db()
      .from("User")
      .update({
        name: data.name,
        username,
        cpf: user.accountType === "CPF" ? cpf : user.cpf,
        cnpj: user.accountType === "CNPJ" ? cnpj : user.cnpj,
        ...(cpfChanged ? { cpfVerifiedAt: null, identityVerifiedAt: null } : {}),
        ...(cnpjChanged ? { identityVerifiedAt: null } : {}),
        phone,
        whatsapp,
        whatsapp2,
        ...(phoneChanged ? { phoneVerifiedAt: null } : {}),
        ...(whatsappChanged ? { whatsappVerifiedAt: null } : {}),
        cep: data.cep ? onlyDigits(data.cep) : null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        district: location.district || null,
        city: location.city || null,
        state: location.state || null
      })
      .eq("id", user.id)
      .select("name,username,cpf,cnpj,phone,whatsapp,whatsapp2,cep,address,number,complement,district,city,state")
      .single();
    throwDbError(error);

    return json({ user: updated });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const fields = uniqueViolationFields(error);
      if (fields.cpf) return json({ error: "Este CPF já está cadastrado em outra conta." }, 409);
      if (fields.cnpj) return json({ error: "Este CNPJ já está cadastrado em outra conta." }, 409);
      return json({ error: "Este username já está em uso. Escolha outro." }, 409);
    }
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


