import { onlyDigits } from "@/lib/formatters";

const requireVerifiedMobileContact = process.env.REQUIRE_VERIFIED_MOBILE_CONTACT === "true";

export const mobileContactRequiredMessage = "Informe um telefone celular ou WhatsApp no seu perfil para anunciar ou interagir com outros usuários.";
export const verifiedAccountRequiredMessage = "Para anunciar ou interagir com anunciantes, complete seu cadastro e verifique seu telefone celular ou WhatsApp.";

export function hasMobileContact(user: { phone?: string | null; whatsapp?: string | null }) {
  return isMobilePhone(user.whatsapp) || isMobilePhone(user.phone);
}

export function hasAccountVerification(user: {
  emailVerifiedAt?: string | Date | null;
  cpfVerifiedAt?: string | Date | null;
  phoneVerifiedAt?: string | Date | null;
  whatsappVerifiedAt?: string | Date | null;
  identityVerifiedAt?: string | Date | null;
}) {
  return Boolean(user.emailVerifiedAt || user.identityVerifiedAt || user.cpfVerifiedAt || user.phoneVerifiedAt || user.whatsappVerifiedAt);
}

export function canUseContactFeatures(user: {
  email?: string | null;
  emailVerifiedAt?: string | Date | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpfVerifiedAt?: string | Date | null;
  phoneVerifiedAt?: string | Date | null;
  whatsappVerifiedAt?: string | Date | null;
  identityVerifiedAt?: string | Date | null;
}) {
  if (!user.email?.trim()) return false;
  if (!requireVerifiedMobileContact) return true;
  return hasVerifiedMobileContact(user);
}

export function hasVerifiedMobileContact(user: {
  phone?: string | null;
  whatsapp?: string | null;
  phoneVerifiedAt?: string | Date | null;
  whatsappVerifiedAt?: string | Date | null;
  identityVerifiedAt?: string | Date | null;
}) {
  return Boolean(
    user.identityVerifiedAt ||
    (isMobilePhone(user.phone) && user.phoneVerifiedAt) ||
    (isMobilePhone(user.whatsapp) && user.whatsappVerifiedAt)
  );
}

function isMobilePhone(value: string | null | undefined) {
  return onlyDigits(value).length === 11;
}
