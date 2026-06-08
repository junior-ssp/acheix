import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

type ApkCandidate = {
  apkPath: string;
  metadataPath?: string;
  mtimeMs: number;
  size: number;
};

type ApkMetadata = {
  elements?: Array<{
    versionCode?: number;
    versionName?: string;
    outputFile?: string;
  }>;
};

const root = resolve(__dirname, "..");
const outputsDir = join(root, "android", "app", "build", "outputs", "apk");
const publicDir = join(root, "public");
const downloadsDir = join(publicDir, "downloads");
const publicManifestPath = join(publicDir, "app-version.json");

function walkApks(dir: string): ApkCandidate[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir, { withFileTypes: true });
  const candidates: ApkCandidate[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      candidates.push(...walkApks(fullPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".apk")) continue;

    const stats = statSync(fullPath);
    const metadataPath = join(dirname(fullPath), "output-metadata.json");

    candidates.push({
      apkPath: fullPath,
      metadataPath: existsSync(metadataPath) ? metadataPath : undefined,
      mtimeMs: stats.mtimeMs,
      size: stats.size
    });
  }

  return candidates;
}

function readMetadata(candidate: ApkCandidate) {
  if (!candidate.metadataPath) return {};

  try {
    const metadata = JSON.parse(readFileSync(candidate.metadataPath, "utf8")) as ApkMetadata;
    const fileName = basename(candidate.apkPath);
    const exactElement = metadata.elements?.find((element) => element.outputFile === fileName);
    const element = exactElement || metadata.elements?.[0];

    return {
      versionCode: element?.versionCode ?? null,
      versionName: element?.versionName ?? null
    };
  } catch {
    return {};
  }
}

const candidates = walkApks(outputsDir).sort((a, b) => b.mtimeMs - a.mtimeMs);
const latest = candidates[0];

if (!latest) {
  throw new Error(`Nenhum APK encontrado em ${outputsDir}. Gere uma build Android antes de publicar.`);
}

mkdirSync(publicDir, { recursive: true });

const metadata = readMetadata(latest);
const publishedAt = new Date().toISOString();
const versionPart = String(metadata.versionName || metadata.versionCode || publishedAt)
  .toLowerCase()
  .replace(/[^a-z0-9.-]+/g, "-")
  .replace(/^-+|-+$/g, "");
const versionedFileName = `achei-x-${versionPart || "latest"}.apk`;
const versionedApkPath = join(downloadsDir, versionedFileName);

mkdirSync(downloadsDir, { recursive: true });
copyFileSync(latest.apkPath, versionedApkPath);

writeFileSync(
  publicManifestPath,
  JSON.stringify(
    {
      appName: "Achei X",
      platform: "android",
      apkUrl: `/downloads/${versionedFileName}`,
      latestApkUrl: `/downloads/${versionedFileName}`,
      fileName: versionedFileName,
      sourceFile: latest.apkPath.replace(root, "").replace(/\\/g, "/").replace(/^\//, ""),
      sizeBytes: latest.size,
      publishedAt,
      ...metadata
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(`APK versionado publicado: ${versionedApkPath}`);
console.log(`Manifesto publicado: ${publicManifestPath}`);
console.log(`Versao: ${metadata.versionName ?? "desconhecida"} (${metadata.versionCode ?? "sem versionCode"})`);
