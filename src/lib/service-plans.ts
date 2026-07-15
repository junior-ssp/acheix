export type ServicePlanCode = "SERVICE_FREE" | "SERVICE_BRONZE" | "SERVICE_SILVER" | "SERVICE_GOLD" | "SERVICE_X6" | "SERVICE_X12" | "SERVICE_PRO";

export const servicePlans = {
  SERVICE_FREE: {
    code: "SERVICE_FREE",
    name: "GRÁTIS",
    priceCents: 0,
    durationMonths: 6,
    maxCategories: 4,
    imageLimit: 1,
    description: "Comece grátis e apareça nas buscas."
  },
  SERVICE_BRONZE: {
    code: "SERVICE_BRONZE",
    name: "BRONZE",
    priceCents: 990,
    durationMonths: 2,
    maxCategories: 4,
    imageLimit: 2,
    description: "Plano simples para aparecer melhor."
  },
  SERVICE_SILVER: {
    code: "SERVICE_SILVER",
    name: "PRATA",
    priceCents: 1990,
    durationMonths: 3,
    maxCategories: 5,
    imageLimit: 3,
    description: "Mais tempo e mais atividades."
  },
  SERVICE_GOLD: {
    code: "SERVICE_GOLD",
    name: "OURO",
    priceCents: 2990,
    durationMonths: 6,
    maxCategories: 6,
    imageLimit: 3,
    description: "Mais destaque por mais tempo."
  },
  SERVICE_X6: {
    code: "SERVICE_X6",
    name: "X6",
    priceCents: 4990,
    durationMonths: 6,
    maxCategories: 6,
    imageLimit: 3,
    description: "Pacote de 6 meses."
  },
  SERVICE_X12: {
    code: "SERVICE_X12",
    name: "X12",
    priceCents: 8990,
    durationMonths: 12,
    maxCategories: 6,
    imageLimit: 3,
    description: "Pacote anual."
  },
  SERVICE_PRO: {
    code: "SERVICE_PRO",
    name: "OURO",
    priceCents: 990,
    durationMonths: 12,
    maxCategories: 6,
    imageLimit: 3,
    description: "Plano antigo mantido por compatibilidade."
  }
} as const;

export const publicServicePlanCodes = ["SERVICE_FREE", "SERVICE_BRONZE", "SERVICE_SILVER", "SERVICE_GOLD", "SERVICE_X6", "SERVICE_X12"] as const;

export function getServicePlan(code: string | null | undefined) {
  if (isServicePlanCode(code)) return servicePlans[code];
  return servicePlans.SERVICE_FREE;
}

export function isServicePlanCode(value: string | null | undefined): value is ServicePlanCode {
  return Boolean(value && value in servicePlans);
}

export function isPaidServicePlanCode(value: string | null | undefined) {
  return isServicePlanCode(value) && value !== "SERVICE_FREE";
}
