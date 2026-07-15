import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const root = process.cwd();
const adminUrl = "https://admin.acheix.com.br/admin";
const normalUrl = "https://acheix.com.br";
const adminApkSource = join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const adminApkTarget = join(root, "public", "acesso-admin-ax-9f4c2b71", "achei-x-admin-1.0.0-9f4c2b71.apk");
const androidBuildGradle = join(root, "android", "app", "build.gradle");
const androidStrings = join(root, "android", "app", "src", "main", "res", "values", "strings.xml");
const publicDir = join(root, "public");
const apkBuildCacheDir = join(root, ".tmp", "admin-apk-public-cache");
const userIcon = join(root, "resources", "icon.png");
const adminIcon = join(root, "resources", "admin-icon.png");
const userIconBackup = join(root, ".tmp", "user-icon-before-admin-build.png");
const androidResources = join(root, "android", "app", "src", "main", "res");
const googleServices = join(root, "android", "app", "google-services.json");
const googleServicesBackup = join(root, ".tmp", "google-services.user.json");

type BuildEnv = Record<string, string>;
type StashedApk = { from: string; to: string };

function run(command: string, args: string[], env: BuildEnv, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} falhou.`);
  }
}

function sync(env: BuildEnv) {
  run("npx.cmd", ["cap", "sync", "android"], env);
}

function generateAndroidIcons() {
  run("npx.cmd", ["capacitor-assets", "generate", "--android"], {});
}

function removeGeneratedSplashImages(dir = androidResources) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) removeGeneratedSplashImages(entryPath);
    if (entry.isFile() && entry.name === "splash.png") rmSync(entryPath, { force: true });
  }
}

function collectApks(dir: string, result: string[] = []) {
  if (!existsSync(dir)) return result;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      collectApks(entryPath, result);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".apk")) {
      result.push(entryPath);
    }
  }

  return result;
}

function stashPublicApks() {
  const apks = collectApks(publicDir);
  const stashed: StashedApk[] = [];

  for (const apkPath of apks) {
    const target = join(apkBuildCacheDir, relative(publicDir, apkPath));
    mkdirSync(dirname(target), { recursive: true });
    renameSync(apkPath, target);
    stashed.push({ from: apkPath, to: target });
  }

  return stashed;
}

function restorePublicApks(stashed: StashedApk[]) {
  for (const item of stashed.reverse()) {
    if (!existsSync(item.to)) continue;
    mkdirSync(dirname(item.from), { recursive: true });
    renameSync(item.to, item.from);
  }
}

function patchAndroidShell(input: { applicationId: string; appName: string }) {
  const gradle = readFileSync(androidBuildGradle, "utf8")
    .replace(/applicationId "br\.com\.acheix\.(app|admin)"/, `applicationId "${input.applicationId}"`);
  writeFileSync(androidBuildGradle, gradle);

  const strings = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">${input.appName}</string>
    <string name="title_activity_main">${input.appName}</string>
    <string name="package_name">${input.applicationId}</string>
    <string name="custom_url_scheme">${input.applicationId}</string>
</resources>
`;
  writeFileSync(androidStrings, strings);
}

async function main() {
  const adminEnv = {
    CAP_APP_ID: "br.com.acheix.admin",
    CAP_APP_NAME: "Admin",
    CAP_SERVER_URL: adminUrl
  };

  const normalEnv = {
    CAP_APP_ID: "br.com.acheix.app",
    CAP_APP_NAME: "Achei X",
    CAP_SERVER_URL: normalUrl
  };

  const stashedApks = stashPublicApks();
  if (!existsSync(userIcon) || !existsSync(adminIcon)) throw new Error("Ícones de usuário ou Admin não encontrados.");
  mkdirSync(dirname(userIconBackup), { recursive: true });
  copyFileSync(userIcon, userIconBackup);

  try {
    try {
      copyFileSync(adminIcon, userIcon);
      generateAndroidIcons();
      removeGeneratedSplashImages();
      sync(adminEnv);
      patchAndroidShell({ applicationId: "br.com.acheix.admin", appName: "Admin" });
      if (existsSync(googleServices)) renameSync(googleServices, googleServicesBackup);
      run("cmd.exe", ["/c", "gradlew.bat", "assembleDebug"], adminEnv, join(root, "android"));
    } finally {
      if (existsSync(googleServicesBackup)) renameSync(googleServicesBackup, googleServices);
      copyFileSync(userIconBackup, userIcon);
      generateAndroidIcons();
      removeGeneratedSplashImages();
      sync(normalEnv);
      patchAndroidShell({ applicationId: "br.com.acheix.app", appName: "Achei X" });
    }
  } finally {
    if (existsSync(userIconBackup)) rmSync(userIconBackup, { force: true });
    restorePublicApks(stashedApks);
  }

  if (!existsSync(adminApkSource)) {
    throw new Error(`APK Admin não encontrado em ${adminApkSource}`);
  }

  mkdirSync(dirname(adminApkTarget), { recursive: true });
  copyFileSync(adminApkSource, adminApkTarget);
  console.log(`APK Admin criado: ${adminApkTarget}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
