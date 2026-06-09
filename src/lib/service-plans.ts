export type ServicePlanCode = "SERVICE_FREE" | "SERVICE_PRO";

export const servicePlans = {
  SERVICE_FREE: {
    code: "SERVICE_FREE",
    name: "Grátis",
    priceCents: 0,
    durationMonths: 6,
    maxCategories: 3,
    description: "Teste grátis por 6 meses com até 3 atividades."
  },
  SERVICE_PRO: {
    code: "SERVICE_PRO",
    name: "Plano PRO",
    priceCents: 990,
    durationMonths: 12,
    maxCategories: 5,
    description: "Plano PRO por 12 meses com até 5 atividades."
  }
} as const;

export function getServicePlan(code: string | null | undefined) {
  return code === "SERVICE_PRO" ? servicePlans.SERVICE_PRO : servicePlans.SERVICE_FREE;
}

export function isServicePlanCode(value: string | null | undefined): value is ServicePlanCode {
  return value === "SERVICE_FREE" || value === "SERVICE_PRO";
}
