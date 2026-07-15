import { hashPassword } from "@/lib/auth";
import { getPublicAppBaseUrl } from "@/lib/app-url";
import { canShareCpfBetween } from "@/lib/cpf-sharing-exceptions";
import { validateCpfWithProviders } from "@/lib/cpf-validation";
import { onlyDigits } from "@/lib/formatters";
import { json } from "@/lib/http";
import { identityNameMatches, identityNameMismatchMessage } from "@/lib/identity-name-match";
import { getSupabaseAdminClient } from "@/lib/supabase-auth";
import { db, isUniqueViolation, newDbId, throwDbError, uniqueViolationFields } from "@/lib/supabase-db";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  let supabaseUserId: string | undefined;

  try {
    const data = registerSchema.parse(await request.json());
    const cpf = data.accountType === "CPF" ? onlyDigits(data.cpf ?? "") : null;
    const cnpj = data.accountType === "CNPJ" ? onlyDigits(data.cnpj ?? "") : null;
    const email = data.email.toLowerCase();
    const appBaseUrl = getPublicAppBaseUrl(request);

    if (cpf) {
      const cpfValidation = await validateCpfWithProviders(cpf);
      if (!cpfValidation.valid) {
        return json({ error: cpfValidation.error ?? "Informe um CPF válido." }, 422);
      }
      if (cpfValidation.name && !identityNameMatches(data.name, cpfValidation.name)) {
        return json({ error: identityNameMismatchMessage() }, 422);
      }
    }

    const existingUsers = await findExistingUsers({ cpf, cnpj, email });
    if (existingUsers.some((user) => user.email === email)) return json({ error: "Este e-mail já está cadastrado. Use outro e-mail ou entre na sua conta." }, 409);
    if (cpf && existingUsers.some((user) => user.cpf === cpf && !canShareCpfBetween(email, user.email))) return json({ error: "Este CPF já está cadastrado. Use outro CPF ou entre na sua conta." }, 409);
    if (cnpj && existingUsers.some((user) => user.cnpj === cnpj)) return json({ error: "Este CNPJ já está cadastrado. Use outro CNPJ ou entre na sua conta." }, 409);

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
        appUrl: appBaseUrl
      }
    });

    if (authError || !authData.user) {
      return json({ error: supabaseAuthErrorMessage(authError?.message) }, authError?.status === 429 ? 429 : 400);
    }

    supabaseUserId = authData.user.id;
    const now = new Date().toISOString();
    const userId = newDbId();
    if (!userId) {
      console.error("auth.register.invalid_user_id", { email, accountType: data.accountType });
      return json({ error: registerGenericErrorMessage }, 500);
    }

    const { data: user, error: insertError } = await db()
      .from("User")
      .insert({
        id: userId,
        name: data.name,
        accountType: data.accountType,
        cpf,
        cnpj,
        birthDate: data.birthDate ?? null,
        email,
        emailVerifiedAt: now,
        supabaseUid: supabaseUserId,
        passwordHash: await hashPassword(data.password),
        phone: null,
        whatsapp: null,
        cep: null,
        address: null,
        number: null,
        complement: null,
        district: null,
        city: null,
        state: null,
        notificationChannel: "IN_APP",
        notificationChannels: ["IN_APP", "PUSH", "EMAIL"],
        acceptedTermsAt: now,
        updatedAt: now
      })
      .select("id,name,email,role")
      .single();
    if (insertError) {
      console.error("auth.register.user_insert_failed", {
        code: typeof insertError === "object" && insertError && "code" in insertError ? insertError.code : undefined,
        message: typeof insertError === "object" && insertError && "message" in insertError ? insertError.message : undefined,
        details: typeof insertError === "object" && insertError && "details" in insertError ? insertError.details : undefined,
        email,
        accountType: data.accountType,
        hasUserId: Boolean(userId)
      });
      throwDbError(insertError);
    }

    return json({ user, message: "Cadastro criado com sucesso. Seu e-mail foi registrado e validado no Achei X. Entre para completar seu perfil com telefone celular ou WhatsApp." }, 201);
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

    console.error("auth.register.unexpected_error", error);
    return json({ error: registerGenericErrorMessage }, 400);
  }
}

const registerGenericErrorMessage = "Não foi possível criar sua conta. Tente novamente.";

async function findExistingUsers(input: { cpf: string | null; cnpj: string | null; email: string }) {
  const filters = [`email.eq.${input.email}`];
  if (input.cpf) filters.push(`cpf.eq.${input.cpf}`);
  if (input.cnpj) filters.push(`cnpj.eq.${input.cnpj}`);
  const { data, error } = await db()
    .from("User")
    .select("cpf,cnpj,email,supabaseUid")
    .or(filters.join(","))
    .limit(10);
  throwDbError(error);
  return data ?? [];
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
