"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";

type AppManifest = {
  apkUrl?: string;
  publishedAt?: string;
  versionCode?: number | null;
  versionName?: string | null;
};

type UpdateState = {
  apkUrl: string;
  currentVersion?: string;
  dismissKey: string;
  latestVersion?: string | null;
};

const dismissedKeyPrefix = "acheix:update-dismissed:";

function compareVersions(current?: string, latest?: string | null) {
  if (!current || !latest) return 0;

  const currentParts = current.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const latestParts = latest.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(currentParts.length, latestParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const latestPart = latestParts[index] ?? 0;
    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}

export function AppUpdatePrompt() {
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkForUpdate() {
      try {
        const [{ Capacitor }, { App }] = await Promise.all([import("@capacitor/core"), import("@capacitor/app")]);

        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
        if (active) setIsNativeAndroid(true);

        const [info, response] = await Promise.all([
          App.getInfo(),
          fetch(`/app-version.json?t=${Date.now()}`, { cache: "no-store" })
        ]);

        if (!response.ok) return;

        const manifest = (await response.json()) as AppManifest;
        const latestVersion = manifest.versionName;
        const latestCode = manifest.versionCode;
        const dismissedKey = `${dismissedKeyPrefix}${latestCode ?? latestVersion ?? manifest.publishedAt ?? "latest"}`;

        if (localStorage.getItem(dismissedKey) === "1") {
          if (active) setDismissed(true);
          return;
        }

        const nativeBuild = Number.parseInt(info.build || "0", 10);
        const newerByCode = typeof latestCode === "number" && latestCode > nativeBuild;
        const newerByVersion = compareVersions(info.version, latestVersion) < 0;

        if (active && manifest.apkUrl && (newerByCode || newerByVersion)) {
          setUpdate({
            apkUrl: manifest.apkUrl,
            currentVersion: info.version,
            dismissKey: dismissedKey,
            latestVersion
          });
        }
      } catch {
        // The update prompt must never block navigation.
      }
    }

    const timer = window.setTimeout(checkForUpdate, 3500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const versionLabel = useMemo(() => {
    if (!update?.latestVersion) return "Nova versão disponível";
    return `Nova versão ${update.latestVersion} disponível`;
  }, [update?.latestVersion]);

  const apkDownloadUrl = useMemo(() => {
    if (!update?.apkUrl) return "";
    const baseUrl = typeof window === "undefined" ? "https://acheix.com.br" : window.location.origin;
    return new URL(update.apkUrl, baseUrl).toString();
  }, [update?.apkUrl]);

  const downloadPageUrl = useMemo(() => {
    const baseUrl = typeof window === "undefined" ? "https://acheix.com.br" : window.location.origin;
    return new URL("/baixar-app", baseUrl).toString();
  }, []);

  const androidIntentUrl = useMemo(() => {
    if (!apkDownloadUrl) return "";
    const parsed = new URL(apkDownloadUrl);
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${parsed.protocol.replace(":", "")};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(downloadPageUrl)};end`;
  }, [apkDownloadUrl, downloadPageUrl]);

  const primaryDownloadUrl = isNativeAndroid && androidIntentUrl ? androidIntentUrl : apkDownloadUrl;

  if (!update || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    if (update?.dismissKey) {
      localStorage.setItem(update.dismissKey, "1");
    }
  }

  async function openApkDownload(event: MouseEvent<HTMLAnchorElement>) {
    if (!apkDownloadUrl) return;

    setDownloadStatus("Se o download não abrir, toque em Link direto ou Copiar link abaixo.");

    if (isNativeAndroid) {
      return;
    }

    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        event.preventDefault();
        setDownloadStatus("Abrindo o download no navegador do celular...");

        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: apkDownloadUrl });
          return;
        } catch {
          window.open(apkDownloadUrl, "_blank", "noopener,noreferrer");
          window.setTimeout(() => {
            window.location.assign(apkDownloadUrl);
          }, 600);
          setDownloadStatus("Se o download não abrir, toque no link direto abaixo.");
        }
      }
    } catch {
      setDownloadStatus("Se o download não abrir, toque no link direto abaixo.");
      window.location.assign(apkDownloadUrl);
    }
  }

  async function copyDownloadLink() {
    if (!apkDownloadUrl) return;
    await navigator.clipboard?.writeText(apkDownloadUrl).catch(() => undefined);
    setDownloadStatus("Link copiado. Cole no navegador do celular para baixar o APK.");
  }

  return (
    <div className="fixed inset-x-3 bottom-[5.8rem] z-50 rounded-2xl border border-yellow-300/30 bg-black/95 p-3 text-white shadow-2xl shadow-black/40 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[23rem]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-gold text-black">
          <Download size={20} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-yellow-200">{versionLabel}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-300">
            Atualize o Achei X para receber as melhorias mais recentes do aplicativo.
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href={primaryDownloadUrl}
              onClick={openApkDownload}
              target={isNativeAndroid ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-yellow-300 px-3 text-xs font-black text-black transition hover:bg-yellow-200"
            >
              Atualizar agora
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-neutral-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar aviso de atualização"
              title="Fechar"
            >
              <X size={17} />
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-yellow-100">{downloadStatus || "Se o botão não baixar, use o link direto abaixo."}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <a href={apkDownloadUrl} target="_blank" rel="noopener noreferrer" className="font-black text-yellow-200 underline underline-offset-4">
              Link direto do APK
            </a>
            <a href={downloadPageUrl} target="_blank" rel="noopener noreferrer" className="font-black text-yellow-200 underline underline-offset-4">
              Página de download
            </a>
            <button type="button" onClick={copyDownloadLink} className="font-black text-white underline underline-offset-4">
              Copiar link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


