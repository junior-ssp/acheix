export const serviceContactDisclosureVersion = "servicos-contato-publico-v1-2026-06-07";

export const serviceContactDisclosureTitle = "Termo de Responsabilidade e Autorização de Divulgação de Contatos";

export const serviceContactDisclosureItems = [
  "Sou o legítimo titular dos dados informados ou possuo autorização legal para cadastrá-los e divulgá-los.",
  "Autorizo expressamente o Achei X a exibir publicamente meus dados de contato cadastrados, incluindo telefone, WhatsApp e demais informações disponibilizadas por mim no perfil de serviços.",
  "Reconheço que, após a ativação da visualização pública, meus dados poderão ser acessados por visitantes do site, aplicativo, mecanismos de busca e terceiros, estando ciente dos riscos inerentes à divulgação pública dessas informações.",
  "Declaro que todas as informações fornecidas são verdadeiras, atualizadas e de minha exclusiva responsabilidade.",
  "Comprometo-me a manter os dados atualizados e a corrigir ou remover informações incorretas sempre que necessário.",
  "Assumo integral responsabilidade por meus serviços, anúncios, propostas, negociações, contratos, orçamentos, atendimentos, garantias, produtos, pagamentos e quaisquer relações estabelecidas com usuários da plataforma.",
  "Reconheço que o Achei X atua exclusivamente como plataforma de divulgação e aproximação entre usuários, sem participar das negociações, contratos, pagamentos, execução de serviços ou entrega de produtos.",
  "Declaro estar ciente de que a divulgação dos dados ocorre por minha livre e expressa solicitação e que posso desativar a visualização pública a qualquer momento pelas ferramentas disponibilizadas na plataforma.",
  "Autorizo o tratamento dos dados fornecidos para fins de publicação, exibição, busca, contato comercial, segurança, auditoria e funcionamento dos serviços oferecidos pela plataforma, observada a legislação aplicável."
];

export type ServiceContactPreference = "LEADS_ONLY" | "PHONE" | "WHATSAPP" | "BOTH";

export function isPublicServiceContactPreference(value: ServiceContactPreference | string | null | undefined) {
  return value === "PHONE" || value === "WHATSAPP" || value === "BOTH";
}

export function serviceContactDisclosureText() {
  return [
    serviceContactDisclosureTitle,
    "",
    "Ao ativar a opção de exibição pública de contatos, o anunciante ou prestador de serviços declara e concorda que:",
    ...serviceContactDisclosureItems.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Ao marcar a opção de concordância e ativar a visualização pública dos contatos, o anunciante confirma que leu, compreendeu e aceita integralmente este Termo de Responsabilidade e Autorização de Divulgação de Contatos."
  ].join("\n");
}

export function parseServiceComplement(value: string | null | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

export function isServicePublicContactEnabled(complement: string | null | undefined) {
  const parsed = parseServiceComplement(complement);
  const preference = parsed.contactPreference ?? (parsed.contactDisclosure?.publicContactEnabled ? "BOTH" : "LEADS_ONLY");
  return Boolean(isPublicServiceContactPreference(preference) && parsed.contactDisclosure?.publicContactEnabled && parsed.contactDisclosure?.acceptedAt);
}

export function serviceContactPreferenceFromComplement(complement: string | null | undefined): ServiceContactPreference {
  const parsed = parseServiceComplement(complement);
  const preference = parsed.contactPreference;
  if (preference === "PHONE" || preference === "WHATSAPP" || preference === "BOTH") return preference;
  return "LEADS_ONLY";
}
