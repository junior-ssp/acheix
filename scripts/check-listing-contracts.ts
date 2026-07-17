import { isPlanAllowedForCategory } from "../src/lib/plan-rules";
import { publicServicePlanCodes } from "../src/lib/service-plans";
import { realEstatePurposes, realEstateTypesByPurpose } from "../src/lib/real-estate-taxonomy";
import { listingSchema } from "../src/lib/validators";

const baseListing = {
  title: "Imóvel válido para auditoria",
  description: "",
  category: "REAL_ESTATE" as const,
  priceCents: 10000000,
  city: "São Paulo",
  state: "SP",
  district: "Centro",
  showPhone: false,
  showWhatsapp: false,
  showEmail: false,
  retainChatAudit: true,
  planCode: "SILVER" as const,
  acceptTerms: true,
  photos: []
};

for (const purpose of realEstatePurposes) {
  for (const type of realEstateTypesByPurpose[purpose]) {
    const result = listingSchema.safeParse({ ...baseListing, type, realEstate: { purpose, features: [] } });
    if (!result.success) {
      throw new Error(`Contrato de imóvel inválido para ${purpose}/${type}: ${result.error.issues.map((issue) => issue.message).join("; ")}`);
    }
  }
}

const incompatibleType = listingSchema.safeParse({ ...baseListing, type: "Hotel", realEstate: { purpose: "SALE", features: [] } });
if (incompatibleType.success) throw new Error("Tipo incompatível não pode ser aceito para a finalidade Venda.");

for (const planCode of ["X6", "X12"] as const) {
  if (!isPlanAllowedForCategory(planCode, "VEHICLE")) throw new Error(`${planCode} deve aceitar Veículos para qualquer pessoa.`);
  if (!isPlanAllowedForCategory(planCode, "REAL_ESTATE")) throw new Error(`${planCode} deve aceitar Imóveis para qualquer pessoa.`);
  if (isPlanAllowedForCategory(planCode, "PRODUCT")) throw new Error(`${planCode} não deve aceitar Produtos.`);
}

for (const planCode of ["SERVICE_X6", "SERVICE_X12"] as const) {
  if (!publicServicePlanCodes.includes(planCode)) throw new Error(`${planCode} deve estar disponível para Serviços e Empresas sem restrição de CPF/CNPJ.`);
}

console.log("Listing contracts OK: taxonomia imobiliária e elegibilidade pública X6/X12 validadas.");
