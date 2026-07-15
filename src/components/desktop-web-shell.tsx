"use client";

import { useEffect } from "react";

export function DesktopWebShell() {
  useEffect(() => {
    let isNative = false;
    let isMounted = true;
    let cleanup: (() => void) | undefined;
    let timer: number | undefined;

    async function init() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!isMounted) return;
        isNative = Capacitor.isNativePlatform();
      } catch {
        isNative = false;
      }

      function updateDesktopClass() {
        const shouldBeDesktop = !isNative && window.innerWidth >= 1024;
        document.documentElement.classList.toggle("web-desktop-layout", shouldBeDesktop);
      }

      updateDesktopClass();
      window.addEventListener("resize", updateDesktopClass);
      cleanup = () => window.removeEventListener("resize", updateDesktopClass);
    }

    timer = window.setTimeout(init, 1200);

    return () => {
      isMounted = false;
      if (timer) window.clearTimeout(timer);
      cleanup?.();
      document.documentElement.classList.remove("web-desktop-layout");
    };
  }, []);

  return null;
}
