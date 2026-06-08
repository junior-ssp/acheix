"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { setAppBadgeCount } from "@/lib/app-badge-client";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  linkLabel: string | null;
  linkUrl: string | null;
  primaryActionLabel: string | null;
  primaryActionUrl: string | null;
  contactLeadId: string | null;
};

export function NotificationPopups() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const current = items[0];

  const loadNotifications = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    if (response?.status === 401) {
      setItems([]);
      setUnreadCount(0);
      setAppBadgeCount(0);
      return;
    }
    if (!response?.ok) return;
    const data = await response.json().catch(() => null);
    if (!Array.isArray(data?.notifications)) return;

    const visibleNotifications = data.notifications.filter((item: NotificationItem) => item.title !== "Pagamento pendente");
    setItems(visibleNotifications);
    const nextUnreadCount = Number.isFinite(data?.unreadCount) ? Math.min(Number(data.unreadCount), visibleNotifications.length) : visibleNotifications.length;
    setUnreadCount(nextUnreadCount);
    setAppBadgeCount(nextUnreadCount);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function loadIfActive() {
      if (cancelled) return;
      loadNotifications();
    }

    function loadWhenVisible() {
      if (document.visibilityState === "visible") loadIfActive();
    }

    const initialTimer = window.setTimeout(loadIfActive, 9000);
    window.addEventListener("focus", loadIfActive);
    window.addEventListener("online", loadIfActive);
    document.addEventListener("visibilitychange", loadWhenVisible);
    const timer = window.setInterval(loadIfActive, 60000);

    const nativeTimer = window.setTimeout(() => {
      import("@capacitor/core")
        .then(({ Capacitor }) => {
          if (!Capacitor.isNativePlatform()) return null;
          return import("@capacitor/app");
        })
        .then((appModule) => {
          if (!appModule || cancelled) return;
          appModule.App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) loadIfActive();
          });
        })
        .catch(() => undefined);
    }, 12000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadIfActive);
      window.removeEventListener("online", loadIfActive);
      document.removeEventListener("visibilitychange", loadWhenVisible);
      window.clearTimeout(initialTimer);
      window.clearTimeout(nativeTimer);
      window.clearInterval(timer);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!current || !enabled) return;
    const actionUrl = current.primaryActionUrl || current.linkUrl;
    const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
    audio.play().catch(() => undefined);
    if ("Notification" in window && Notification.permission === "granted") {
      const push = new Notification(current.title, {
        body: current.linkLabel ? `${current.linkLabel}\n${current.message}` : current.message,
        badge: "/icon.svg",
        icon: "/icon.svg",
        data: { url: actionUrl || "" }
      });
      push.onclick = () => {
        window.focus();
        if (actionUrl) window.location.href = actionUrl;
      };
    }
    setAppBadgeCount(unreadCount);
  }, [current, enabled, unreadCount]);

  async function closeCurrent() {
    if (!current) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: current.id })
    }).catch(() => null);
    setItems((existing) => existing.slice(1));
    const nextUnreadCount = Math.max(0, unreadCount - 1);
    setUnreadCount(nextUnreadCount);
    setAppBadgeCount(nextUnreadCount);
  }

  async function deleteCurrent() {
    if (!current?.contactLeadId) return;
    await fetch(`/api/contact-leads/${current.contactLeadId}`, { method: "DELETE" }).catch(() => null);
    await closeCurrent();
  }

  async function enableBrowserNotifications() {
    setEnabled(true);
    loadNotifications();
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  if (!current) return null;

  return (
    <div className="fixed left-1/2 top-1/2 z-[100] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-yellow-300 bg-black p-4 text-white shadow-2xl shadow-black/50">
      <div className="flex items-start gap-3">
        <button type="button" onClick={enableBrowserNotifications} className="grid h-10 w-10 shrink-0 place-items-center rounded-full btn-gold" title="Ativar alerta">
          <Bell size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm text-yellow-300">{current.title}</strong>
          {current.linkUrl && current.linkLabel ? (
            <a href={current.linkUrl} className="mt-1 block text-sm font-black text-white underline decoration-yellow-300/70 underline-offset-4 hover:text-yellow-200">
              {current.linkLabel}
            </a>
          ) : null}
          <p className="mt-1 text-sm text-neutral-200">{current.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {current.primaryActionUrl ? (
              <a href={current.primaryActionUrl} className="rounded-md px-3 py-2 text-xs btn-gold">
                {current.primaryActionLabel || "Abrir"}
              </a>
            ) : null}
            {current.contactLeadId ? (
              <button type="button" onClick={deleteCurrent} className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200">Excluir</button>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={closeCurrent} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white" title="Fechar">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
