import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

type LockFile = {
  version: number;
  masterPhraseSha256: string;
  protectedFiles: Array<{
    path: string;
    sha256: string;
    reason: string;
  }>;
};

const lockPath = ".listing-preview-safety-lock.json";
const phrase = process.env.LISTING_PREVIEW_GUARD_PHRASE || process.env.ANUNCIOS_PREVIEW_MASTER_PHRASE || "";
const phraseSha256 = phrase ? sha256(phrase) : process.env.LISTING_PREVIEW_GUARD_SHA256 || "";
const failures: string[] = [];

if (!existsSync(lockPath)) {
  fail([`Arquivo ${lockPath} não encontrado. A trava de preview dos anúncios foi removida.`]);
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

for (const file of listSourceFiles(["src/app", "src/components"])) {
  const text = readFileSync(file, "utf8");
  const listingCardMatches = text.matchAll(/<ListingCard\b(?![^>]*\bonOpenPreview=)[^>]*>/gs);
  for (const match of listingCardMatches) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    failures.push(`${file}:${line} usa <ListingCard> sem onOpenPreview. Isso faz o app/site abrir o anúncio completo direto.`);
  }
}

if (!failures.length) {
  console.log("Listing preview safety guard OK.");
  process.exit(0);
}

if (phraseSha256 && phraseSha256 === lock.masterPhraseSha256) {
  console.warn("Listing preview safety guard unlocked by master phrase.");
  for (const failure of failures) console.warn(`- ${failure}`);
  process.exit(0);
}

fail([
  "TRAVA DE SEGURANCA DO PREVIEW DOS ANUNCIOS ATIVADA.",
  "O build/deploy foi bloqueado porque o comportamento de abrir preview/reel dos anúncios foi alterado.",
  "Para autorizar uma mudança real, defina LISTING_PREVIEW_GUARD_PHRASE ou ANUNCIOS_PREVIEW_MASTER_PHRASE antes do build.",
  ...failures.map((failure) => `- ${failure}`)
]);

function listSourceFiles(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) walk(root, files);
  return files.filter((file) => /\.(tsx|ts)$/.test(file));
}

function walk(path: string, files: string[]) {
  if (!existsSync(path)) return;
  const stats = statSync(path);
  if (stats.isFile()) {
    files.push(path.replace(/\\/g, "/"));
    return;
  }
  for (const entry of readdirSync(path)) {
    walk(join(path, entry), files);
  }
}

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
