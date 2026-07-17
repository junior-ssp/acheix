import { moderateProductListing } from "../src/lib/product-intelligence";

const blockedCases = [
  "Carabina calibre 22",
  "Rifle de caça",
  "Pistola airsoft",
  "Munição para espingarda",
  "Chumbinho para carabina",
  "Ozempic lacrado",
  "Rivotril sem receita",
  "Vendo medicamentos",
  "Documento falso",
  "Produto roubado",
  "Conteúdo pornográfico",
  "Pornografia infantil",
  "Conteúdo pedófilo"
];

const allowedCases = [
  "Armação de óculos nova",
  "Armação metálica para telhado",
  "Remédio caseiro para plantas",
  "Carrinho de brinquedo",
  "Cartucho para impressora",
  "Bala de coco artesanal"
];

const failures: string[] = [];
for (const title of blockedCases) {
  const decision = moderateProductListing({ title });
  if (decision.status !== "BLOCKED") failures.push(`Deveria bloquear: ${title} (${decision.status})`);
}
for (const title of allowedCases) {
  const decision = moderateProductListing({ title });
  if (decision.status === "BLOCKED") failures.push(`Não deveria bloquear: ${title} (${decision.reasons.join(", ")})`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Moderação de produtos OK: ${blockedCases.length} bloqueios e ${allowedCases.length} falsos positivos verificados.`);
