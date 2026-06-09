"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Sparkles, Trash2 } from "lucide-react";

export function ServiceProfileActions() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteProfile() {
    if (!window.confirm("Excluir seu perfil de serviços? Ele deixará de aparecer nas buscas.")) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/services/profile/activity", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "CLOSE" })
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setMessage(data?.error ?? "Não foi possível excluir o serviço agora.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Link href="/servicos/anunciar" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm btn-gold">
        <Pencil size={16} />
        Editar Serviço
      </Link>
      <Link href="/servicos/planos" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">
        <Sparkles size={16} />
        Alterar Plano
      </Link>
      <button
        type="button"
        onClick={deleteProfile}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-red-300/30 px-4 text-sm font-black text-red-100 disabled:opacity-60"
      >
        <Trash2 size={16} />
        {busy ? "Excluindo..." : "Excluir Serviço"}
      </button>
      {message ? <p className="basis-full text-sm text-yellow-300">{message}</p> : null}
    </div>
  );
}

