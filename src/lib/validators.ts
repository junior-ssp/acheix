import { z } from "zod";
import { categories } from "@/lib/constants";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) total += Number(digit) * factor--;
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(cpf.slice(0, 9), 10) === Number(cpf[9]) && calc(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function isValidCnpj(value: string) {
  const cnpj = value.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, factors: number[]) => {
    const total = factors.reduce((sum, factor, index) => sum + Number(base[index]) * factor, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12]) &&
    calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13])
  );
}

const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .email("Digite um e-mail válido com @")
  .refine((value) => value.includes("@"), "Digite um e-mail válido com @");

const phoneMessage = "Telefone deve estar no formato (xx) XXXXX-XXXX.";
const whatsappMessage = "WhatsApp deve estar no formato (xx) XXXXX-XXXX.";
const phoneDigits = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");
const isValidPhone = (value: string | null | undefined) => phoneDigits(value).length === 11;
const isValidOptionalPhone = (value: string | null | undefined) => !value || isValidPhone(value);
const isAtLeast18 = (value: Date) => {
  if (!Number.isFinite(value.getTime())) return false;
  const today = new Date();
  const adultDate = new Date(value);
  adultDate.setFullYear(adultDate.getFullYear() + 18);
  return adultDate <= today;
};

export const registerSchema = z.object({
  accountType: z.enum(["CPF", "CNPJ"]).default("CPF"),
  name: z.string().min(2),
  cpf: z.string().refine((value) => value.replace(/\D/g, "").length === 11 && isValidCpf(value), "Informe um CPF válido"),
  cnpj: z.string().optional(),
  birthDate: z.coerce.date().refine(isAtLeast18, "Você precisa ter 18 anos ou mais para se cadastrar."),
  email: emailSchema,
  password: z.string().min(6),
  acceptTerms: z.coerce.boolean().refine(Boolean, "Aceite os Termos de Uso e a Política de Privacidade"),
  phone: z.string().refine(isValidPhone, phoneMessage),
  whatsapp: z.string().refine(isValidPhone, whatsappMessage),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional()
}).superRefine((data, ctx) => {
  if (data.accountType === "CNPJ" && !isValidCnpj(data.cnpj ?? "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cnpj"], message: "Informe um CNPJ válido." });
  }
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  username: z.preprocess(
    (value) => String(value ?? "").trim().toLowerCase(),
    z.string().refine((value) => value === "" || /^[a-z0-9._-]{3,30}$/.test(value), "Username deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, hífen ou underline")
  ),
  phone: z.string().optional().refine(isValidOptionalPhone, phoneMessage),
  whatsapp: z.string().optional().refine(isValidOptionalPhone, whatsappMessage),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional().or(z.literal(""))
});

export const serviceListingSchema = z.object({
  title: z.string().trim().min(4),
  description: z.string().trim().optional(),
  audience: z.enum(["VEHICLE", "REAL_ESTATE"]),
  providerKind: z.enum(["INDIVIDUAL", "COMPANY"]),
  document: z.string().min(11),
  services: z.array(z.string().trim().min(2)).min(1).max(5),
  cep: z.string().optional(),
  state: z.string().trim().length(2),
  city: z.string().trim().min(2),
  district: z.string().trim().optional(),
  address: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  phone: z.string().optional().refine(isValidOptionalPhone, phoneMessage),
  whatsapp: z.string().optional().refine(isValidOptionalPhone, whatsappMessage)
}).superRefine((data, ctx) => {
  if (data.providerKind === "COMPANY" && !isValidCnpj(data.document)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["document"], message: "Informe um CNPJ válido." });
  }
  if (data.providerKind === "INDIVIDUAL" && data.document.replace(/\D/g, "").length !== 11) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["document"], message: "Informe um CPF válido." });
  }
  if (data.providerKind === "COMPANY" && (!data.address || (!data.phone && !data.whatsapp))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Empresa precisa informar endereço e telefone fixo ou WhatsApp de cada loja." });
  }
  if (data.cep && !/^\d{5}-?\d{3}$/.test(data.cep)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cep"], message: "CEP deve estar no formato XXXXX-XXX." });
  }
});

const serviceLocationSchema = z.object({
  cep: z.string().optional(),
  state: z.string().trim().length(2).optional().or(z.literal("")),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  address: z.string().trim().optional(),
  number: z.string().trim().optional()
});

export const serviceProfileSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
  name: z.string().trim().min(2, "Informe o nome."),
  companyLegalName: z.string().trim().optional(),
  companyTradeName: z.string().trim().optional(),
  document: z.string().optional(),
  categories: z.array(z.string().trim().min(2)).min(1).max(5),
  description: z.string().trim().optional(),
  experience: z.string().trim().optional(),
  businessHours: z.string().trim().optional(),
  cep: z.string().optional(),
  state: z.string().trim().length(2),
  city: z.string().trim().min(2),
  district: z.string().trim().min(1, "Informe o bairro."),
  address: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  privatePhone: z.string().optional().refine(isValidOptionalPhone, phoneMessage),
  privateWhatsapp: z.string().optional().refine(isValidOptionalPhone, whatsappMessage),
  privateEmail: z.string().trim().email().optional().or(z.literal("")),
  website: z.string().trim().url().optional().or(z.literal("")),
  profilePhoto: z.string().trim().url().optional().or(z.literal("")),
  companyLogo: z.string().trim().url().optional().or(z.literal("")),
  locations: z.array(serviceLocationSchema).min(1).max(5).optional(),
  servicePlanCode: z.enum(["SERVICE_FREE", "SERVICE_PRO"]).default("SERVICE_FREE"),
  contactPreference: z.enum(["LEADS_ONLY", "PHONE", "WHATSAPP", "BOTH"]).default("LEADS_ONLY"),
  publicContactEnabled: z.boolean().default(false),
  contactDisclosureAccepted: z.boolean().default(false)
}).superRefine((data, ctx) => {
  if (!data.cep && (!data.city || !data.district)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cep"], message: "Informe CEP ou cidade + bairro." });
  }
  if (data.type === "COMPANY" && !isValidCnpj(data.document ?? "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["document"], message: "Informe um CNPJ válido no formato XX.XXX.XXX/XXXX-XX." });
  }
  if (data.cep && !/^\d{5}-?\d{3}$/.test(data.cep)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cep"], message: "CEP deve estar no formato XXXXX-XXX." });
  }
  if (!data.privatePhone && !data.privateWhatsapp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["privateWhatsapp"], message: "Informe telefone ou WhatsApp." });
  }
  if ((data.publicContactEnabled || data.contactPreference !== "LEADS_ONLY") && !data.contactDisclosureAccepted) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactDisclosureAccepted"], message: "Aceite o termo para tornar seus contatos públicos." });
  }
});

export const listingSchema = z.object({
  title: z.string().min(8),
  description: z.string().trim().optional().default("").refine((value) => !hasPublicContactInText(value), publicContactDescriptionMessage),
  category: z.enum(["VEHICLE", "REAL_ESTATE"]),
  type: z.string().min(2),
  priceCents: z.number().int().nonnegative(),
  city: z.string().optional().or(z.literal("")),
  state: z.string().length(2).optional().or(z.literal("")),
  district: z.string().optional(),
  showPhone: z.boolean().default(false),
  showWhatsapp: z.boolean().default(false),
  planCode: z.enum(["FREE", "BRONZE", "SILVER", "GOLD", "X6", "X12"]),
  acceptTerms: z.boolean().refine(Boolean, "Aceite os termos antes de publicar"),
  photos: z.array(z.object({ url: z.string().url(), alt: z.string().optional(), moderationToken: z.string().optional() })).default([]),
  vehicle: z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    version: z.string().min(1),
    fipeCode: z.string().optional(),
    year: z.number().int().min(1900),
    color: z.string().optional(),
    fuel: z.string().optional(),
    gearbox: z.string().optional(),
    mileageKm: z.number().int().nonnegative().optional()
  }).optional(),
  realEstate: z.object({
    purpose: z.enum(["Venda", "Locação"]),
    bedrooms: z.number().int().nonnegative().optional(),
    suites: z.number().int().nonnegative().optional(),
    bathrooms: z.number().int().nonnegative().optional(),
    parking: z.number().int().nonnegative().optional(),
    areaM2: z.number().int().positive().optional(),
    features: z.array(z.string()).default([])
  }).optional()
}).superRefine((data, ctx) => {
  const allowed = data.category === "VEHICLE" ? categories.VEHICLE : categories.REAL_ESTATE;
  if (!(allowed as readonly string[]).includes(data.type)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: "Categoria não permitida" });
  }
  if (data.category === "VEHICLE" && !data.vehicle) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vehicle"], message: "Dados do Veículo obrigatórios" });
  }
  if (data.category === "REAL_ESTATE" && !data.realEstate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["realEstate"], message: "Dados do Imóvel obrigatórios" });
  }
});





