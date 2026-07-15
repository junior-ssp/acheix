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

export async function syncMessageBadgeFromServer() {
  const response = await fetch("/api/messages/unread-counts", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const data = await response.json().catch(() => null);
  const count = Number(data?.unreadCount ?? data?.counts?.total ?? 0);
  if (!Number.isFinite(count)) return null;
  const safeCount = Math.max(0, count);
  await setAppBadgeCount(safeCount);
  return safeCount;
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
      await clearDeliveredNotifications();
    }
  } catch {
    // Some launchers/devices do not support numeric app icon badges.
  }
}

async function clearDeliveredNotifications() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllDeliveredNotifications();
  } catch {
    // Notification tray cleanup support depends on the native environment.
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
