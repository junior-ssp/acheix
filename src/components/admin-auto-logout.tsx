"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const runtimeSessionKey = "acheix-admin-runtime-session";
const lastLogoutKey = "acheix-admin-last-logout";

export function AdminAutoLogout() {
  const pathname = usePathname() || "";
  const shouldGuardAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (!shouldGuardAdmin) return;
    if (!sessionStorage.getItem(runtimeSessionKey)) {
      sessionStorage.setItem(runtimeSessionKey, String(Date.now()));
    }
    localStorage.removeItem(lastLogoutKey);
  }, [shouldGuardAdmin]);

  return null;
}
