import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

type Finding = {
  file: string;
  line: number;
  reason: string;
  text: string;
};

const roots = [
  "src",
  "public",
  "android/app/src/main/res",
  "scripts",
  "README.md",
  "README_APK.md",
  "SUPABASE_STORAGE_SETUP.md",
  "VERIFICACAO_IDENTIDADE_STANDBY.md",
  ".env.example"
];

const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".xml", ".html", ".txt", ".ps1", ".example"]);
const ignoredDirs = new Set([".git", ".next", ".vercel", ".gradle", ".tmp", "build", "node_modules"]);
const ignoredFileExtensions = new Set([".apk", ".bin", ".dex", ".dll", ".ico", ".jar", ".jpeg", ".jpg", ".keystore", ".lock", ".png", ".webp"]);

const brokenAccentChars = [0xc3, 0xc2, 0xfffd].map((code) => String.fromCharCode(code)).join("");
const brokenEncodingPatterns: Array<[RegExp, string]> = [
  [new RegExp("[" + escapeRegExp(brokenAccentChars) + "]", "u"), "broken UTF-8 accent or invalid character"]
];

const visibleTextPatterns: Array<[RegExp, string]> = [
  [/\bNao\b|\bnao\b/, "missing accent in nao"],
  [/\bVoce\b|\bvoce\b/, "missing accent in voce"],
  [/\bUsuario\b|\busuario\b/, "missing accent in usuario"],
  [/\bNotificacao\b|\bnotificacao\b|\bNotificacoes\b|\bnotificacoes\b/, "missing accent in notificacao"],
  [/\bobrigatorio\b|\bObrigatorio\b/, "missing accent in obrigatorio"],
  [/\banuncio\b|\banuncios\b/, "missing accent in anuncio/anuncios visible text"],
  [/\bservico\b|\bservicos\b/, "missing accent in servico/servicos visible text"],
  [/\bpublicacao\b|\bpublicacoes\b/, "missing accent in publicacao/publicacoes"],
  [/\bdescricao\b|\bDescricao\b/, "missing accent in descricao visible text"],
  [/\bEndereco\b|\bendereco\b/, "missing accent in endereco"],
  [/\bPreferencia\b|\bpreferencia\b/, "missing accent in preferencia"],
  [/\bpossivel\b/, "missing accent in possivel"],
  [/\bapos\b/, "missing accent in apos"],
  [/\brevisao\b/, "missing accent in revisao"],
  [/\bvalidacao\b/, "missing accent in validacao"],
  [/\bocultacao\b/, "missing accent in ocultacao"],
  [/\bMENSAFGENS\b|\bIMBOX\b/, "fix spelling: Mensagens or Inbox"]
];

const stringLiteralPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const findings: Finding[] = [];

for (const root of roots) {
  if (existsSync(root)) scanPath(root);
}

if (findings.length) {
  console.error("\nPortuguese/encoding problems found:\n");
  for (const finding of findings) {
    console.error(finding.file + ":" + finding.line + " - " + finding.reason);
    console.error("  " + finding.text.trim().slice(0, 180));
  }
  console.error("\nFix the text above before build, APK generation or deploy.\n");
  process.exit(1);
}

console.log("Portuguese/encoding OK.");

function scanPath(path: string) {
  const stat = safeStat(path);
  if (!stat) return;

  if (stat.isDirectory()) {
    const name = path.split(/[\\/]/).pop() || "";
    if (ignoredDirs.has(name)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) scanPath(join(path, entry.name));
    return;
  }

  if (!stat.isFile()) return;
  const extension = extname(path);
  if (ignoredFileExtensions.has(extension)) return;
  if (extension && !extensions.has(extension)) return;
  scanFile(path);
}

function scanFile(path: string) {
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  const file = relative(process.cwd(), path).replace(/\\/g, "/");

  lines.forEach((line, index) => {
    for (const [pattern, reason] of brokenEncodingPatterns) {
      if (pattern.test(line)) add(file, index + 1, reason, line);
    }
  });

  if (file.endsWith("scripts/check-portuguese.ts")) return;

  for (const chunk of extractStringLiterals(content)) {
    if (shouldIgnoreText(chunk.text)) continue;
    for (const [pattern, reason] of visibleTextPatterns) {
      if (pattern.test(chunk.text)) add(file, chunk.line, reason, chunk.text);
    }
  }
}

function extractStringLiterals(content: string) {
  const chunks: Array<{ text: string; line: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = stringLiteralPattern.exec(content))) {
    chunks.push({ text: match[2], line: content.slice(0, match.index).split(/\r?\n/).length });
  }
  return chunks;
}

function shouldIgnoreText(text: string) {
  const normalized = text.trim();
  if (!normalized) return true;
  if (/^https?:\/\//i.test(normalized)) return true;
  if (normalized.includes("/anuncios") || normalized.includes("/servicos")) return true;
  if (normalized.includes("#meus-anuncios") || normalized.includes("#meus-servicos")) return true;
  if (/^\/[a-z0-9/?#=&._${}()\-]+$/i.test(normalized)) return true;
  if (/^[a-z0-9_./?#[\]{}():,=|&%+\-$]+$/i.test(normalized)) return true;
  if (normalized.includes(".from(") || normalized.includes(".select(")) return true;
  return false;
}

function add(file: string, line: number, reason: string, text: string) {
  if (findings.some((item) => item.file === file && item.line === line && item.reason === reason)) return;
  findings.push({ file, line, reason, text });
}

function safeStat(path: string) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
