import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Download } from "lucide-react";

type AppManifest = {
  apkUrl?: string;
  fileName?: string;
  sizeBytes?: number;
  versionName?: string | null;
};

const fallbackManifest: AppManifest = {
  apkUrl: "/downloads/achei-x-1.7.apk",
  fileName: "achei-x-1.7.apk",
  versionName: "1.7"
};

function getManifest(): AppManifest {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "public", "app-version.json"), "utf8")) as AppManifest;
  } catch {
    return fallbackManifest;
  }
}

function formatSize(sizeBytes?: number) {
  if (!sizeBytes) return "";
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DownloadAppPage() {
  const manifest = getManifest();
  const apkUrl = manifest.apkUrl || fallbackManifest.apkUrl!;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-4 py-12 text-white">
      <p className="text-sm font-black uppercase tracking-normal text-yellow-300">Achei X Android</p>
      <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Baixar App</h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-300">
        {"Baixe a vers\u00e3o mais recente do aplicativo. Depois do download, abra o arquivo APK e escolha instalar ou atualizar."}
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-bold text-neutral-300">{"Vers\u00e3o dispon\u00edvel"}</p>
        <p className="mt-1 text-2xl font-black text-yellow-200">{manifest.versionName || "Atual"}</p>
        <p className="mt-1 text-sm text-neutral-400">
          {manifest.fileName || fallbackManifest.fileName} {formatSize(manifest.sizeBytes)}
        </p>

        <a
          href={apkUrl}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#22C55E] px-5 text-sm font-black text-black transition hover:bg-[#34D399]"
        >
          <Download size={18} strokeWidth={2.5} />
          Baixar APK agora
        </a>

        <p className="mt-4 break-all text-xs text-neutral-400">Link direto: https://acheix.com.br{apkUrl}</p>
      </div>
    </main>
  );
}
