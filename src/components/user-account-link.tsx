"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useEffect, useState } from "react";

type CurrentUser = {
  name?: string | null;
};

export function UserAccountLink() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const initials = initialsFromName(user?.name);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setUser(data?.user ?? null);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  return (
    <Link
      className={`relative grid h-10 w-10 place-items-center rounded-full border text-white transition ${
        user
          ? "border-emerald-300/70 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.22)] hover:border-emerald-200 hover:bg-emerald-300/20"
          : "border-white/10 bg-white/5 hover:border-yellow-300/50 hover:bg-yellow-300/10 hover:text-yellow-300"
      }`}
      href={user ? "/dashboard#perfil" : "/entrar"}
      prefetch={false}
      aria-label={user ? `Conta logada: ${user.name}` : "Entrar na conta"}
      title={user ? `Logado como ${user.name}` : "Entrar"}
    >
      {user ? <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-emerald-300 via-yellow-200 to-emerald-500 text-sm font-black text-black">{initials}</span> : <User size={19} strokeWidth={2.4} />}
      {user ? <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-black bg-emerald-300" aria-hidden="true" /> : null}
    </Link>
  );
}

function initialsFromName(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return "AX";
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return initials.toUpperCase();
}
