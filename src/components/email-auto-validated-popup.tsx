"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const storageKey = "acheix-email-auto-validated";

export function EmailAutoValidatedPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(storageKey) !== "1") return;
      window.sessionStorage.removeItem(storageKey);
      setVisible(true);
    } catch {
      return;
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-1/2 z-[110] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-300 bg-black p-4 text-white shadow-2xl shadow-black/50">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-400 text-black">
          <CheckCircle2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm text-emerald-300">E-mail validado</strong>
          <p className="mt-1 text-sm text-neutral-200">
            Seu e-mail foi registrado e validado no Achei X. Complete seu perfil com telefone celular ou WhatsApp para anunciar e interagir com segurança.
          </p>
          <button type="button" onClick={() => setVisible(false)} className="mt-3 rounded-md px-3 py-2 text-xs btn-gold">
            Entendi
          </button>
        </div>
        <button type="button" onClick={() => setVisible(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white" title="Fechar">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
