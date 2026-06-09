"use client";

import { useEffect } from "react";

export function NoCopyPolicyGuard() {
  useEffect(() => {
    const selector = "[data-no-copy-policy]";
    const shouldBlock = (event: Event) => event.target instanceof Element && Boolean(event.target.closest(selector));
    const block = (event: Event) => {
      if (!shouldBlock(event)) return;
      event.preventDefault();
    };

    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("dragstart", block);

    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);

  return null;
}
