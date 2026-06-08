"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const runtimeSessionKey = "acheix-admin-runtime-session";
const lastExitKey = "acheix-admin-last-exit";
const lastLogoutKey = "acheix-admin-last-logout";
const maxRuntimeSessionAgeMs = 12 * 60 * 60 * 1000;
const exitGraceMs = 1500;

export function AdminAutoLogout() {
  const pathname = usePathname() || "";
  const loggingOutRef = useRef(false);
  const shouldGuardAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (!shouldGuardAdmin) return;

    let removeListeners: Array<() => void> = [];
    let active = true;

    async function logoutAdmin(reason: string, redirect = true) {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        sessionStorage.removeItem(runtimeSessionKey);
        localStorage.setItem(lastLogoutKey, reason);
        markExit(reason);
        await fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => null);
      } finally {
        if (active && redirect) window.location.replace("/entrar?next=/admin");
      }
    }

    function hasCurrentRuntimeSession() {
      const startedAt = Number(sessionStorage.getItem(runtimeSessionKey));
      return Number.isFinite(startedAt) && Date.now() - startedAt < maxRuntimeSessionAgeMs;
    }

    function shouldInvalidateReopenedAdmin() {
      const startedAt = Number(sessionStorage.getItem(runtimeSessionKey));
      const lastExitAt = Number(localStorage.getItem(lastExitKey));
      if (!Number.isFinite(startedAt)) return true;
      if (!Number.isFinite(lastExitAt)) return false;
      return lastExitAt > startedAt + exitGraceMs;
    }

    function markExit(reason: string) {
      localStorage.setItem(lastExitKey, String(Date.now()));
      localStorage.setItem(lastLogoutKey, reason);
    }

    function logoutOnExit(reason: string) {
      markExit(reason);
      void logoutAdmin(reason, false);
    }

    async function setupNativeLogout() {
      const [{ Capacitor }, { App }] = await Promise.all([import("@capacitor/core"), import("@capacitor/app")]);
      if (!Capacitor.isNativePlatform()) return;

      const appState = await App.getState().catch(() => ({ isActive: true }));
      if (!appState.isActive) {
        await logoutAdmin("app_opened_inactive");
        return;
      }

      const stateListener = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) logoutOnExit("app_background");
      });
      const pauseListener = await App.addListener("pause", () => logoutOnExit("app_pause"));
      removeListeners.push(() => void stateListener.remove(), () => void pauseListener.remove());
    }

    if (!hasCurrentRuntimeSession() || shouldInvalidateReopenedAdmin()) {
      void logoutAdmin("admin_reopened_requires_password");
      return () => {
        active = false;
      };
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") logoutOnExit("document_hidden");
    };
    const handlePageHide = () => logoutOnExit("page_hide");
    const handleBeforeUnload = () => logoutOnExit("before_unload");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    removeListeners.push(
      () => document.removeEventListener("visibilitychange", handleVisibilityChange),
      () => window.removeEventListener("pagehide", handlePageHide),
      () => window.removeEventListener("beforeunload", handleBeforeUnload)
    );

    void setupNativeLogout().catch(() => undefined);

    return () => {
      active = false;
      removeListeners.forEach((remove) => remove());
      removeListeners = [];
    };
  }, [shouldGuardAdmin]);

  return null;
}
