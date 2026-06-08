"use client";

type BadgeNavigator = Navigator & {
  clearAppBadge?: () => Promise<void>;
  setAppBadge?: (contents?: number) => Promise<void>;
};

export async function setAppBadgeCount(count: number) {
  const safeCount = Math.max(0, Math.floor(count));

  await setNativeBadge(safeCount);
  await setWebBadge(safeCount);
}

async function setNativeBadge(count: number) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { Badge } = await import("@capawesome/capacitor-badge");

    if (count > 0) {
      await Badge.set({ count });
    } else {
      await Badge.clear();
    }
  } catch {
    // Some launchers/devices do not support numeric app icon badges.
  }
}

async function setWebBadge(count: number) {
  if (typeof navigator === "undefined") return;

  try {
    const badgeNavigator = navigator as BadgeNavigator;
    if (count > 0 && badgeNavigator.setAppBadge) {
      await badgeNavigator.setAppBadge(count);
    } else if (count <= 0 && badgeNavigator.clearAppBadge) {
      await badgeNavigator.clearAppBadge();
    }
  } catch {
    // Browser badge support is optional.
  }
}
