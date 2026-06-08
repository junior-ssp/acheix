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

const STORAGE_KEY = "acheix:last-push-token";

export function PushRegistration() {
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) return;
      } catch {
        // Continue with web push detection when Capacitor is unavailable.
      }
      registerPush(false).then((status) => {
        if (status === "permission-needed") setPermissionNeeded(true);
      });
    }, 9000);
    return () => window.clearTimeout(timer);
  }, []);

  async function enablePush() {
    setBusy(true);
    const status = await registerPush(true);
    setBusy(false);
    setPermissionNeeded(status === "permission-needed");
  }

  if (!permissionNeeded) return null;

  return (
    <div className="fixed left-1/2 top-1/2 z-[55] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-yellow-300/30 bg-black/95 p-3 text-white shadow-2xl shadow-black/50">
      <p className="text-sm font-black text-yellow-200">Ativar notificações</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-300">
        Receba aviso com badge quando chegar uma nova mensagem no Achei X.
      </p>
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

async function registerPush(interactive: boolean): Promise<"ok" | "permission-needed" | "unavailable"> {
  const nativeStatus = await registerNativePush(interactive);
  if (nativeStatus !== "unavailable") return nativeStatus;
  return registerWebPush(interactive);
}

async function registerNativePush(interactive: boolean): Promise<"ok" | "permission-needed" | "unavailable"> {
  try {
    const [{ Capacitor }, { PushNotifications }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/push-notifications")
    ]);

    if (!Capacitor.isNativePlatform()) return "unavailable";

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") {
      if (!interactive) return "permission-needed";
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") return "permission-needed";

    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", async ({ value }) => {
      await saveToken({
        token: value,
        platform: Capacitor.getPlatform() === "ios" ? "IOS" : "ANDROID",
        deviceLabel: navigator.userAgent.slice(0, 120)
      });
      await refreshBadgeFromServer();
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
    return "ok";
  } catch {
    return "unavailable";
  }
}

async function registerWebPush(interactive: boolean): Promise<"ok" | "permission-needed" | "unavailable"> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unavailable";

  if (Notification.permission !== "granted") {
    if (!interactive) return Notification.permission === "default" ? "permission-needed" : "unavailable";
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "permission-needed";
  }

  const messaging = await getFirebaseMessaging();
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!messaging || !vapidKey) return "unavailable";

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return "unavailable";

  await saveToken({ token, platform: "WEB", deviceLabel: navigator.userAgent.slice(0, 120) });
  await refreshBadgeFromServer();
  return "ok";
}

async function saveToken(payload: TokenPayload) {
  const previous = localStorage.getItem(STORAGE_KEY);
  await fetch("/api/push-tokens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }).then((response) => {
    if (response.ok) localStorage.setItem(STORAGE_KEY, payload.token);
    if (response.status === 401 && previous === payload.token) localStorage.removeItem(STORAGE_KEY);
  }).catch(() => undefined);
}

async function refreshBadgeFromServer() {
  const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return;
  const data = await response.json().catch(() => null);
  const unreadCount = Number(data?.unreadCount ?? 0);
  if (Number.isFinite(unreadCount)) await setAppBadgeCount(unreadCount);
}
