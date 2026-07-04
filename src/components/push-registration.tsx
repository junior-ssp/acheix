"use client";

import { useEffect, useState } from "react";
import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase-client";
import { setAppBadgeCount } from "@/lib/app-badge-client";

type TokenPayload = {
  token: string;
  platform: "ANDROID" | "IOS" | "WEB";
  deviceLabel?: string;
};

type PushStatus = "ok" | "permission-needed" | "unavailable";
type PushResult = {
  status: PushStatus;
  detail?: string;
};

const STORAGE_KEY = "acheix:last-push-token";

export function PushRegistration() {
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        await import("@capacitor/core");
      } catch {
        // Continue with web push detection when Capacitor is unavailable.
      }
      registerPush(false, setDiagnostic).then((result) => {
        if (result.status === "permission-needed") setPermissionNeeded(true);
      });
    }, 9000);
    return () => window.clearTimeout(timer);
  }, []);

  async function enablePush() {
    setDiagnostic("Solicitando permissao...");
    setBusy(true);
    const result = await registerPush(true, setDiagnostic);
    setBusy(false);
    setDiagnostic(result.detail ?? statusMessage(result.status));
    setPermissionNeeded(true);
  }

  if (!permissionNeeded) return null;

  return (
    <div className="fixed left-1/2 top-1/2 z-[55] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-yellow-300/30 bg-black/95 p-3 text-white shadow-2xl shadow-black/50">
      <p className="text-sm font-black text-yellow-200">Ativar notificações</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-300">
        Receba aviso com badge quando chegar uma nova mensagem no Achei X.
      </p>
      {diagnostic ? (
        <p className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs font-semibold leading-relaxed text-yellow-100">
          {diagnostic}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={enablePush} disabled={busy} className="h-9 flex-1 rounded-full bg-yellow-300 px-3 text-xs font-black text-black disabled:opacity-60">
          {busy ? "Ativando..." : "Ativar agora"}
        </button>
        <button type="button" onClick={() => setPermissionNeeded(false)} className="h-9 rounded-full border border-white/10 px-3 text-xs font-black text-neutral-200">
          Depois
        </button>
      </div>
    </div>
  );
}

function statusMessage(status: PushStatus) {
  if (status === "ok") return "Notificacoes ativadas. Registrando aparelho...";
  if (status === "permission-needed") return "Permissao de notificacao ainda nao foi liberada.";
  return "Nao foi possivel ativar notificacoes neste aparelho.";
}

async function registerPush(interactive: boolean, report: (message: string) => void): Promise<PushResult> {
  const nativeResult = await registerNativePush(interactive, report);
  if (nativeResult.status !== "unavailable") return nativeResult;
  return registerWebPush(interactive, report);
}

async function registerNativePush(interactive: boolean, report: (message: string) => void): Promise<PushResult> {
  try {
    const [{ Capacitor }, { PushNotifications }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/push-notifications")
    ]);

    if (!Capacitor.isNativePlatform()) return { status: "unavailable", detail: "Ambiente nativo nao detectado." };

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") {
      if (!interactive) return { status: "permission-needed" };
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") return { status: "permission-needed", detail: "Permissao negada pelo Android." };

    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", async ({ value }) => {
      report("Token Firebase recebido. Salvando no servidor...");
      const saved = await saveToken({
        token: value,
        platform: Capacitor.getPlatform() === "ios" ? "IOS" : "ANDROID",
        deviceLabel: navigator.userAgent.slice(0, 120)
      });
      if (saved.ok) {
        report("Aparelho registrado com sucesso. Pode testar o push.");
        await refreshBadgeFromServer();
      } else {
        report(saved.detail);
      }
    });
    await PushNotifications.addListener("registrationError", (error) => {
      report(`Erro Firebase: ${readableError(error)}`);
    });
    await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      const count = Number(notification.data?.unreadCount ?? notification.badge ?? 0);
      if (Number.isFinite(count) && count > 0) await setAppBadgeCount(count);
      else await refreshBadgeFromServer();
    });
    await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const url = String(event.notification.data?.url || "/dashboard#interesses");
      window.location.href = url;
    });
    await PushNotifications.register();
    return { status: "ok", detail: "Permissao concedida. Aguardando token Firebase..." };
  } catch (error) {
    return { status: "unavailable", detail: `Erro no plugin nativo: ${readableError(error)}` };
  }
}

async function registerWebPush(interactive: boolean, report: (message: string) => void): Promise<PushResult> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return { status: "unavailable", detail: "Notificacoes web indisponiveis neste ambiente." };
  }

  if (Notification.permission !== "granted") {
    if (!interactive) return Notification.permission === "default" ? { status: "permission-needed" } : { status: "unavailable", detail: "Permissao web bloqueada." };
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { status: "permission-needed", detail: "Permissao web nao foi liberada." };
  }

  const messaging = await getFirebaseMessaging();
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!messaging || !vapidKey) return { status: "unavailable", detail: "Firebase Web/VAPID nao configurado." };

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return { status: "unavailable", detail: "Firebase Web nao retornou token." };

  report("Token Web recebido. Salvando no servidor...");
  const saved = await saveToken({ token, platform: "WEB", deviceLabel: navigator.userAgent.slice(0, 120) });
  if (!saved.ok) return { status: "unavailable", detail: saved.detail };
  await refreshBadgeFromServer();
  return { status: "ok", detail: "Aparelho registrado com sucesso. Pode testar o push." };
}

async function saveToken(payload: TokenPayload): Promise<{ ok: true } | { ok: false; detail: string }> {
  const previous = localStorage.getItem(STORAGE_KEY);
  try {
    const response = await fetch("/api/push-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      localStorage.setItem(STORAGE_KEY, payload.token);
      return { ok: true };
    }
    if (response.status === 401 && previous === payload.token) localStorage.removeItem(STORAGE_KEY);
    const data = await response.json().catch(() => null);
    return { ok: false, detail: `Servidor recusou token (${response.status}): ${data?.error ?? response.statusText}` };
  } catch (error) {
    return { ok: false, detail: `Falha de rede ao salvar token: ${readableError(error)}` };
  }
}

async function refreshBadgeFromServer() {
  const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;
  const data = await response.json().catch(() => null);
  const unreadCount = Number(data?.unreadCount ?? 0);
  if (Number.isFinite(unreadCount)) await setAppBadgeCount(unreadCount);
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "erro desconhecido";
  }
}
