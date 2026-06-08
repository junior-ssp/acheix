import { isValidCpf } from "@/lib/validators";
import { validateCpfWithProviders } from "@/lib/cpf-validation";

export type IdentityVerificationInput = {
  cpf: string;
  name: string;
  birthDate: Date;
  phone?: string | null;
  whatsapp?: string | null;
};

export function validateFreeIdentityFields(input: IdentityVerificationInput) {
  const errors: string[] = [];
  if (!isValidCpf(input.cpf)) errors.push("CPF inválido.");
  if (input.name.trim().split(/\s+/).length < 2) errors.push("Informe nome e sobrenome.");
  if (!isAdultEnough(input.birthDate)) errors.push("Informe uma data de nascimento válida.");
  if (!input.phone || input.phone.replace(/\D/g, "").length < 10) errors.push("Informe um telefone válido.");
  if (!input.whatsapp || input.whatsapp.replace(/\D/g, "").length < 10) errors.push("Informe um WhatsApp válido.");
  return errors;
}

export async function verifyCpfWithProviderStandby(input: IdentityVerificationInput) {
  const result = await validateCpfWithProviders(input.cpf);
  if (!result.valid) {
    return {
      status: "REJECTED",
      message: result.error ?? "CPF recusado pela validação."
    };
  }

  if (result.provider !== "local") {
    return {
      status: "VERIFIED",
      message: `CPF validado por ${result.provider}.`
    };
  }

  return {
    status: "STANDBY",
    message: "CPF validado pelo algoritmo oficial. Configure HYDRACPF ou VALIDASEGURO para consulta externa adicional."
  };
}

function isAdultEnough(date: Date) {
  if (!Number.isFinite(date.getTime())) return false;
  const now = new Date();
  if (date >= now) return false;
  return now.getFullYear() - date.getFullYear() <= 120;
}
