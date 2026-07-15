import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

type LockFile = {
  version: number;
  masterPhraseSha256: string;
  protectedFiles: Array<{
    path: string;
    sha256: string;
    reason: string;
  }>;
};

const lockPath = ".home-grid-safety-lock.json";
const phrase = process.env.HOME_GRID_GUARD_PHRASE || process.env.GRID_MASTER_PHRASE || "";
const phraseSha256 = phrase ? sha256(phrase) : process.env.HOME_GRID_GUARD_SHA256 || "";
const failures: string[] = [];

if (!existsSync(lockPath)) {
  fail([`Arquivo ${lockPath} não encontrado. A trava do grid da página principal foi removida.`]);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8")) as LockFile;
for (const item of lock.protectedFiles) {
  if (!existsSync(item.path)) {
    failures.push(`${item.path} foi removido. Motivo: ${item.reason}`);
    continue;
  }

  const current = fileSha256(item.path);
  if (current !== item.sha256) {
    failures.push(`${item.path} foi alterado. Motivo: ${item.reason}`);
  }
}

const homePath = "src/app/page.tsx";
if (existsSync(homePath)) {
  const home = readFileSync(homePath, "utf8");
  if (!home.includes("<SponsoredBannerCarousel")) {
    failures.push(`${homePath} não mantém o carrossel visual de banners patrocinados na página principal.`);
  }
  if (!home.includes('className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-3 pb-8 sm:gap-6 sm:px-4 sm:pb-10 lg:hidden"')) {
    failures.push(`${homePath} não preserva a visualização mobile antiga com duas colunas.`);
  }
  if (!home.includes('className="mx-auto hidden max-w-6xl grid-cols-3 gap-5 px-4 pb-10 lg:grid"')) {
    failures.push(`${homePath} não mantém VEÍCULOS, IMÓVEIS e PROFISSIONAIS em três colunas no desktop.`);
  }
  if (!home.includes('<Section title="VEÍCULOS"') || !home.includes('<Section title="IMÓVEIS"') || !home.includes("<ProfessionalSection")) {
    failures.push(`${homePath} não mantém a ordem desktop autorizada: VEÍCULOS, IMÓVEIS e PROFISSIONAIS.`);
  }
  if (!home.includes('gridClassName = "grid gap-3 sm:grid-cols-2 sm:gap-4"') && !home.includes('gridClassName="grid gap-3 sm:grid-cols-2 sm:gap-4"')) {
    failures.push(`${homePath} não mantém os anúncios da home em uma coluna no celular e duas colunas apenas em telas maiores.`);
  }
  if (!home.includes("<ListingResultsGrid")) {
    failures.push(`${homePath} não usa ListingResultsGrid para manter preview/reel sem quebrar o layout antigo.`);
  }
}

if (!failures.length) {
  console.log("Home grid safety guard OK.");
  process.exit(0);
}

if (phraseSha256 && phraseSha256 === lock.masterPhraseSha256) {
  console.warn("Home grid safety guard unlocked by master phrase.");
  for (const failure of failures) console.warn(`- ${failure}`);
  process.exit(0);
}

fail([
  "TRAVA DE SEGURANCA DO GRID DA PAGINA PRINCIPAL ATIVADA.",
  "O build/deploy foi bloqueado porque a home foi alterada sem a frase mestre.",
  "Para autorizar uma mudança real, defina HOME_GRID_GUARD_PHRASE ou GRID_MASTER_PHRASE antes do build.",
  ...failures.map((failure) => `- ${failure}`)
]);

function fileSha256(path: string) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  return sha256(text);
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(lines: string[]): never {
  console.error(lines.join("\n"));
  process.exit(1);
}
