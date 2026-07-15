import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function checkProductionRegressions() {
  const failures: string[] = [];

  forbidExistingFile(failures, "src/components/theme-color-button.tsx", "theme color toggle component must not exist");
  forbidSourceText(failures, "ThemeColorButton", "theme color toggle import/use must not return");
  forbidSourceText(failures, "theme-color-button", "theme color toggle module path must not return");

  requireFileText(failures, "src/components/bottom-navigation.tsx", "\"Mensagens\"", "bottom navigation must keep Messages");
  requireFileText(failures, "src/components/bottom-navigation.tsx", "\"/mensagens\"", "bottom navigation must link to Messages");
  requireFileText(failures, "src/components/bottom-navigation.tsx", "MessageCircle", "bottom navigation must keep the Messages icon");
  requireFileText(failures, "src/components/bottom-navigation.tsx", "grid-cols-5", "bottom navigation must keep five slots");

  forbidFileText(failures, "src/components/bottom-navigation.tsx", "justify-around", "bottom navigation must not return to the old flexible four-item layout");

  guardDownloadButton(failures, "src/app/layout.tsx");
  guardDownloadButton(failures, "src/components/app-chrome.tsx");

  forbidFileText(failures, "src/lib/listing-search.ts", "if (!realEstate) return false;", "active real estate listings must not disappear when complementary details are missing");

  if (failures.length) {
    console.error("Production regression guard blocked this build.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Production regression guard OK.");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/check-production-regressions.ts")) {
  checkProductionRegressions();
}

function guardDownloadButton(failures: string[], path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  if (!text.includes("/baixar-app")) return;

  if (!text.includes("Baixar App")) {
    failures.push(`${path}: Android download button must keep visible text`);
  }
  if (text.includes("AndroidLogo")) {
    failures.push(`${path}: Android download button must not use the old Android icon`);
  }
  if (text.includes("hidden whitespace-nowrap sm:inline")) {
    failures.push(`${path}: Android download text must not be hidden on mobile`);
  }
}

function requireFileText(failures: string[], path: string, expected: string, reason: string) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing file. ${reason}.`);
    return;
  }
  const text = readFileSync(path, "utf8");
  if (!text.includes(expected)) failures.push(`${path}: missing ${expected}. ${reason}.`);
}

function forbidFileText(failures: string[], path: string, forbidden: string, reason: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  if (text.includes(forbidden)) failures.push(`${path}: found ${forbidden}. ${reason}.`);
}

function forbidExistingFile(failures: string[], path: string, reason: string) {
  if (existsSync(path)) failures.push(`${path}: ${reason}.`);
}

function forbidSourceText(failures: string[], forbidden: string, reason: string) {
  for (const file of listSourceFiles(["src"])) {
    const text = readFileSync(file, "utf8");
    if (text.includes(forbidden)) failures.push(`${file}: found ${forbidden}. ${reason}.`);
  }
}

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
    if (entry === "node_modules" || entry === ".next") continue;
    walk(join(path, entry), files);
  }
}
