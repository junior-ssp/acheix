"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { BarChart3, ClipboardList, FileText, LifeBuoy, LogOut, Menu, MessageCircle, Trash2, UserRound } from "lucide-react";
import { legalCompany } from "@/lib/legal-info";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    fetch("/api/messages/unread-counts", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const count = Number(data?.unreadCount ?? data?.counts?.total ?? 0);
        if (Number.isFinite(count)) setMessageUnreadCount(Math.max(0, count));
      })
      .catch(() => undefined);
  }, []);


  function goToDashboardSection(event: React.MouseEvent<HTMLAnchorElement>, sectionId: string, href: string) {
    setOpen(false);
    if (window.location.pathname !== "/dashboard") return;
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (section) {
      window.history.replaceState(null, "", href);
      window.setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/entrar";
  }

  async function deleteAccount() {
    const confirmed = window.confirm("Excluir sua conta? Tudo será apagado.");
    if (!confirmed) return;
    const second = window.confirm("Tem certeza? Não dá para voltar atrás.");
    if (!second) return;
    setBusy(true);
    const response = await fetch("/api/me", { method: "DELETE" }).catch(() => null);
    if (response?.ok) {
      window.location.href = "/";
      return;
    }
    setBusy(false);
    window.alert("Não deu para excluir agora. Tente de novo.");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-black text-white transition hover:border-yellow-300/50 hover:bg-yellow-300/10 hover:text-yellow-300"
        aria-label="Abrir menu da conta"
        aria-expanded={open}
      >
        <Menu size={20} strokeWidth={2.5} />
        <span className="hidden sm:inline">Menu</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] z-[120] w-72 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-black text-white">Conta e Anúncios</p>
            <p className="text-xs text-neutral-400">Veja sua conta.</p>
          </div>
          <div className="grid p-2">
            <MenuLink href="/mensagens" icon={<MessageCircle size={18} />} label={messageUnreadCount > 0 ? `Mensagens (${messageUnreadCount > 99 ? "99+" : messageUnreadCount})` : "Mensagens"} onClick={() => setOpen(false)} />
            <MenuLink href="/dashboard#central-anuncios" icon={<ClipboardList size={18} />} label="Meus Anúncios" onClick={(event) => goToDashboardSection(event, "central-anuncios", "/dashboard#central-anuncios")} />
            <MenuLink href="/dashboard#perfil" icon={<UserRound size={18} />} label="Meus Dados" onClick={(event) => goToDashboardSection(event, "perfil", "/dashboard#perfil")} />
            <MenuLink href="/dashboard#performance" icon={<BarChart3 size={18} />} label="Meus Resultados" onClick={(event) => goToDashboardSection(event, "performance", "/dashboard#performance")} />
            <MenuLink href={"/fale-conosco" as Route} icon={<LifeBuoy size={18} />} label="Fale Conosco" onClick={() => setOpen(false)} />
            <MenuLink href="/sobre-o-achei-x" icon={<FileText size={18} />} label="Informações Legais" onClick={() => setOpen(false)} />
          </div>
          <div className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-neutral-300">
            <p className="font-black text-white">{legalCompany.legalName}</p>
            <p><a href={`mailto:${legalCompany.contactEmail}`} className="text-yellow-300">{legalCompany.contactEmail}</a></p>
            <p>{legalCompany.headquarters}</p>
            <p className="mt-1 flex flex-wrap gap-2">
              <Link href="/termos-de-uso" onClick={() => setOpen(false)} className="text-yellow-300">Termos</Link>
              <Link href="/politica-de-privacidade" onClick={() => setOpen(false)} className="text-yellow-300">Privacidade</Link>
            </p>
          </div>
          <div className="grid gap-2 border-t border-white/10 p-2">
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="flex items-center gap-3 rounded-xl bg-[#22C55E] px-3 py-3 text-left text-sm font-black text-black shadow-sm shadow-[#22C55E]/20 hover:bg-[#34D399] disabled:opacity-60"
            >
              <LogOut size={18} />
              Sair / Trocar Login
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busy}
              className="flex items-center gap-3 rounded-xl border border-red-400/30 px-3 py-3 text-left text-sm font-black text-red-200 hover:bg-red-500/10 disabled:opacity-60"
            >
              <Trash2 size={18} />
              Excluir conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: Route; icon: React.ReactNode; label: string; onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-white hover:bg-white/10">
      <span className="text-yellow-300">{icon}</span>
      {label}
    </Link>
  );
}

