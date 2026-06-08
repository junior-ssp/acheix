"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

const stackKey = "acheix.internalRouteStack";

export function AndroidBackHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search;
    const current = `${pathname}${search}`;
    const stack = readRouteStack();
    if (stack[stack.length - 1] !== current) {
      writeRouteStack([...stack, current].slice(-50));
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;
    let removeNativeListener: (() => Promise<void> | void) | undefined;

    function goBackInsideApp() {
      const stack = readRouteStack();

      if (stack.length > 1) {
        const nextStack = stack.slice(0, -1);
        const previous = nextStack[nextStack.length - 1] ?? "/";
        writeRouteStack(nextStack);
        router.replace(previous as Route);
        return;
      }

      if (window.location.pathname !== "/") {
        writeRouteStack(["/"]);
        router.replace("/");
      }
    }

    function handleBrowserBack(event: PopStateEvent) {
      const stack = readRouteStack();
      if (stack.length <= 1 && window.location.pathname === "/") return;

      event.preventDefault();
      goBackInsideApp();
    }

    window.addEventListener("popstate", handleBrowserBack);

    import("@capacitor/app")
      .then(({ App }) => App.addListener("backButton", goBackInsideApp))
      .then((handle) => {
        if (!active) {
          void handle.remove();
          return;
        }
        removeNativeListener = handle.remove;
      })
      .catch(() => null);

    return () => {
      active = false;
      window.removeEventListener("popstate", handleBrowserBack);
      if (removeNativeListener) void removeNativeListener();
    };
  }, [router]);

  return null;
}

function readRouteStack() {
  try {
    const value = window.sessionStorage.getItem(stackKey);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRouteStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(stackKey, JSON.stringify(stack));
  } catch {
    // Session storage can be unavailable in restricted webviews.
  }
}
