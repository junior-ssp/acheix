import { hashPassword } from "@/lib/auth";
import { getPublicAppBaseUrl } from "@/lib/app-url";
import { completeLocationFromUserAndDdd } from "@/lib/ddd-autocomplete";
import { validateCpfWithProviders } from "@/lib/cpf-validation";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { validateFreeIdentityFields } from "@/lib/identity-verification";
import { getSupabaseAdminClient } from "@/lib/supabase-auth";
import { db, isUniqueViolation, throwDbError, uniqueViolationFields } from "@/lib/supabase-db";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  let supabaseUserId: string | undefined;

  try {
    const data = registerSchema.parse(await request.json());
    const cpf = onlyDigits(data.cpf);
    const cnpj = data.accountType === "CNPJ" ? onlyDigits(data.cnpj ?? "") : null;
    const phone = onlyDigits(data.phone);
    const whatsapp = onlyDigits(data.whatsapp);
    const email = data.email.toLowerCase();
    const appBaseUrl = getPublicAppBaseUrl(request);
    const location = await completeLocationFromUserAndDdd({ cep: data.cep, state: data.state, city: data.city, district: data.district }, { phone, whatsapp });

    const cpfValidation = await validateCpfWithProviders(cpf);
    if (!cpfValidation.valid) {
      return json({ error: cpfValidation.error ?? "Informe um CPF válido." }, 422);
    }
    const identityErrors = validateFreeIdentityFields({ cpf, name: data.name, birthDate: data.birthDate, phone, whatsapp });
    if (identityErrors.length) return json({ error: identityErrors.join(" ") }, 422);

    const existingUser = await findExistingUser({ cpf, cnpj, email });
    if (existingUser?.email === email) {
      if (existingUser.supabaseUid) {
        await getSupabaseAdminClient()?.auth.admin.updateUserById(existingUser.supabaseUid, { email_confirm: true }).catch(() => null);
      }
      return json({ error: "Este e-mail já está cadastrado. Use outro e-mail ou entre na sua conta." }, 409);
    }
    if (existingUser?.cpf === cpf) return json({ error: "Este CPF já está cadastrado. Use outro CPF ou entre na sua conta." }, 409);
    if (cnpj && existingUser?.cnpj === cnpj) return json({ error: "Este CNPJ já está cadastrado. Use outro CNPJ ou entre na sua conta." }, 409);

    const supabase = getSupabaseAdminClient();
    if (!supabase) return json({ error: "Supabase Auth ainda não está configurado no servidor." }, 500);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        accountType: data.accountType,
        cpf,
        cnpj,
        birthDate: data.birthDate.toISOString().slice(0, 10),
        phone,
        whatsapp,
        appUrl: appBaseUrl
      }
    });

    if (authError || !authData.user) {
      return json({ error: supabaseAuthErrorMessage(authError?.message) }, authError?.status === 429 ? 429 : 400);
    }

    supabaseUserId = authData.user.id;
    const { data: user, error: insertError } = await db()
      .from("User")
      .insert({
        name: data.name,
        accountType: data.accountType,
        cpf,
        cnpj,
        birthDate: data.birthDate.toISOString(),
        email,
        supabaseUid: supabaseUserId,
        passwordHash: await hashPassword(data.password),
        phone,
        whatsapp,
        cep: data.cep ? onlyDigits(data.cep) : null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        district: location.district ?? data.district ?? null,
        city: location.city || data.city || null,
        state: location.state || data.state || null,
        notificationChannel: "IN_APP",
        notificationChannels: ["IN_APP", "PUSH", "EMAIL", "WHATSAPP"],
        acceptedTermsAt: new Date().toISOString()
      })
      .select("id,name,email,role")
      .single();
    throwDbError(insertError);

    return json({ user, message: "Cadastro criado com sucesso. Agora você já pode entrar na sua conta." }, 201);
  } catch (error) {
    if (supabaseUserId) {
      await getSupabaseAdminClient()?.auth.admin.deleteUser(supabaseUserId).catch(() => null);
    }

    if (isUniqueViolation(error)) {
      const fields = uniqueViolationFields(error);
      if (fields.cpf) return json({ error: "Este CPF já está cadastrado. Use outro CPF ou entre na sua conta." }, 409);
      if (fields.cnpj) return json({ error: "Este CNPJ já está cadastrado. Use outro CNPJ ou entre na sua conta." }, 409);
      if (fields.email) return json({ error: "Este e-mail já está cadastrado. Use outro e-mail ou entre na sua conta." }, 409);
      return json({ error: "Já existe um cadastro com esses dados." }, 409);
    }

    return errorResponse(error);
  }
}

async function findExistingUser(input: { cpf: string; cnpj: string | null; email: string }) {
  const filters = [`cpf.eq.${input.cpf}`, `email.eq.${input.email}`];
  if (input.cnpj) filters.push(`cnpj.eq.${input.cnpj}`);
  const { data, error } = await db()
    .from("User")
    .select("cpf,cnpj,email,supabaseUid")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return data;
}

function supabaseAuthErrorMessage(message?: string) {
  const text = message?.toLowerCase() ?? "";
  if (text.includes("rate limit") || text.includes("too many")) {
    return "O Supabase bloqueou temporariamente novos cadastros por excesso de tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (text.includes("already") || text.includes("registered")) return "Este e-mail já está cadastrado.";
  if (text.includes("invalid") && text.includes("email")) return "Digite um e-mail válido com @.";
  if (text.includes("password")) return "Senha fraca. Use pelo menos 6 caracteres.";
  return "Não foi possível criar o usuário no Supabase Auth.";
}

