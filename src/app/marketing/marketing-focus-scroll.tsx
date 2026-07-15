"use client";

import { useEffect } from "react";
import type { MarketingBannerId } from "./marketing-banners";

export function MarketingFocusScroll({ focusId }: { focusId?: MarketingBannerId }) {
  useEffect(() => {
    if (!focusId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(focusId)?.scrollIntoView({ block: "start" });
    });
  }, [focusId]);

  return null;
}
