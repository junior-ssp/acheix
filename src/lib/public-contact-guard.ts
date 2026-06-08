export const publicContactDescriptionMessage =
  "A descrição não pode conter e-mail, telefone, celular ou WhatsApp. Use apenas os canais protegidos do Achei X para receber interessados.";

const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const phoneCandidatePattern = /(?:\+?\d[\d\s().-]{8,}\d)/g;

export function findPublicContactInText(value: string | null | undefined) {
  const text = String(value ?? "");
  if (!text.trim()) return null;
  if (emailPattern.test(text)) return "email";

  const candidates = text.match(phoneCandidatePattern) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    const normalized = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    if ((normalized.length === 10 || normalized.length === 11) && /^[1-9]{2}9?\d{8}$/.test(normalized)) {
      return "telefone";
    }
  }

  return null;
}

export function hasPublicContactInText(value: string | null | undefined) {
  return Boolean(findPublicContactInText(value));
}
