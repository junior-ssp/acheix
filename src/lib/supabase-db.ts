import { getSupabaseAdmin } from "@/lib/supabase";

export type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

export function db() {
  return getSupabaseAdmin();
}

export function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as DbErrorLike).code === "23505");
}

export function uniqueViolationFields(error: unknown) {
  const text = [
    error && typeof error === "object" && "message" in error ? (error as DbErrorLike).message : "",
    error && typeof error === "object" && "details" in error ? (error as DbErrorLike).details : ""
  ].join(" ").toLowerCase();
  return {
    cpf: text.includes("cpf"),
    cnpj: text.includes("cnpj"),
    email: text.includes("email"),
    username: text.includes("username")
  };
}

export function throwDbError(error: unknown) {
  if (error) throw error;
}

export function userSelect() {
  return [
    "id",
    "name",
    "username",
    "email",
    "emailVerifiedAt",
    "accountType",
    "cpf",
    "cnpj",
    "birthDate",
    "phone",
    "whatsapp",
    "cpfVerifiedAt",
    "phoneVerifiedAt",
    "whatsappVerifiedAt",
    "identityVerifiedAt",
    "verificationProvider",
    "cep",
    "address",
    "number",
    "complement",
    "district",
    "city",
    "state",
    "notificationChannel",
    "notificationChannels",
    "allowPublicPhone",
    "allowPublicWhatsapp",
    "allowPublicEmail",
    "role",
    "accountBlockedAt",
    "accountBlockedReason",
    "serviceBlockedAt",
    "serviceBlockedReason"
  ].join(",");
}

export function newDbId() {
  return crypto.randomUUID();
}
