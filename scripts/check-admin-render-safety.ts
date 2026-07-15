import { existsSync, readFileSync } from "node:fs";

const adminPagePath = "src/app/admin/page.tsx";
const failures: string[] = [];

if (!existsSync(adminPagePath)) {
  fail([`Arquivo ${adminPagePath} não encontrado. A trava do painel admin foi removida.`]);
}

const adminPage = readFileSync(adminPagePath, "utf8");

const blockedImports = [
  "@/components/listing-card",
  "../components/listing-card",
  "../../components/listing-card"
];

for (const source of blockedImports) {
  if (adminPage.includes(`from "${source}"`) || adminPage.includes(`from '${source}'`)) {
    failures.push(`${adminPagePath} não pode importar ${source}. Esse padrão causou TypeError no render do /admin em produção.`);
  }
}

if (/\bmoney\s*\(/.test(adminPage)) {
  failures.push(`${adminPagePath} não pode chamar money(...). Use formatCurrency local no painel admin.`);
}

if (!adminPage.includes("function formatCurrency(cents: number)")) {
  failures.push(`${adminPagePath} deve manter formatCurrency local para Receita Registrada, sem depender de componente de anúncio.`);
}

if (!adminPage.includes('value={formatCurrency(totalPayments._sum.amountCents ?? 0)}')) {
  failures.push(`${adminPagePath} deve formatar Receita Registrada com formatCurrency local.`);
}

if (!failures.length) {
  console.log("Admin render safety guard OK.");
  process.exit(0);
}

fail([
  "TRAVA DE SEGURANCA DO PAINEL ADMIN ATIVADA.",
  "O build/deploy foi bloqueado para impedir a volta do erro TypeError: p is not a function no APK Admin.",
  ...failures.map((failure) => `- ${failure}`)
]);

function fail(lines: string[]): never {
  console.error(lines.join("\n"));
  process.exit(1);
}
