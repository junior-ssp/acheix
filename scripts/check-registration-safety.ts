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

const lockPath = ".registration-safety-lock.json";
const phrase = process.env.REGISTRATION_GUARD_PHRASE || process.env.CADASTRO_MASTER_PHRASE || "";
const phraseSha256 = phrase ? sha256(phrase) : process.env.REGISTRATION_GUARD_SHA256 || "";

if (!existsSync(lockPath)) {
  fail([`Arquivo ${lockPath} não encontrado. A trava de cadastro foi removida.`]);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8")) as LockFile;
const failures: string[] = [];

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

const registerRoute = "src/app/api/auth/register/route.ts";
if (existsSync(registerRoute)) {
  const text = readFileSync(registerRoute, "utf8");
  if (/\bid\s*:\s*null\b/.test(text)) failures.push(`${registerRoute} contém id: null no cadastro.`);
  if (!text.includes("const userId = newDbId();")) failures.push(`${registerRoute} não gera userId antes do insert.`);
  if (!text.includes("id: userId")) failures.push(`${registerRoute} não envia id preenchido no insert.`);
  if (!text.includes("Não foi possível criar sua conta. Tente novamente.")) {
    failures.push(`${registerRoute} não contém a mensagem segura de erro para cadastro.`);
  }
}

if (!failures.length) {
  console.log("Registration safety guard OK.");
  process.exit(0);
}

if (phraseSha256 && phraseSha256 === lock.masterPhraseSha256) {
  console.warn("Registration safety guard unlocked by master phrase.");
  for (const failure of failures) console.warn(`- ${failure}`);
  process.exit(0);
}

fail([
  "TRAVA DE SEGURANCA DO CADASTRO ATIVADA.",
  "O build/deploy foi bloqueado porque a área de cadastro foi alterada sem a frase mestre.",
  "Para autorizar uma mudança real, defina REGISTRATION_GUARD_PHRASE ou CADASTRO_MASTER_PHRASE antes do build.",
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
