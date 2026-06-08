"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton({ className = "", label = "Sair / Trocar Login" }: { className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/entrar";
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className} aria-label="Sair e entrar com outro login">
      <LogOut size={16} />
      {busy ? "Saindo..." : label}
    </button>
  );
}
