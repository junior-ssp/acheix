"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Pencil, Sparkles, Trash2 } from "lucide-react";
import { isPaidServicePlanCode } from "@/lib/service-plans";

type ServiceProfileActionsProps = {
  billing?: {
    planCode: string;
    status: string;
    daysUntilDue: number;
  } | null;
};

export function ServiceProfileActions({ billing }: ServiceProfileActionsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const paidPlanActive = isPaidServicePlanCode(billing?.planCode) && billing?.status === "ACTIVE";
  const planButtonLabel = paidPlanActive ? remainingPlanLabel(billing.daysUntilDue) : "Alterar Plano";

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
    <div className="mt-4 grid grid-cols-3 gap-2">
      <Link href="/servicos/anunciar" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-center text-xs btn-gold sm:text-sm">
        <Pencil size={16} />
        Editar Serviço
      </Link>
      <Link href="/servicos/planos" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#22C55E] px-2 text-center text-xs font-black text-black hover:bg-[#34D399] sm:text-sm">
        {paidPlanActive ? <Clock size={16} /> : <Sparkles size={16} />}
        {planButtonLabel}
      </Link>
      <button
        type="button"
        onClick={deleteProfile}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-red-300/30 px-2 text-center text-xs font-black text-red-100 disabled:opacity-60 sm:text-sm"
      >
        <Trash2 size={16} />
        {busy ? "Excluindo..." : "Excluir Serviço"}
      </button>
      {message ? <p className="col-span-3 text-sm text-yellow-300">{message}</p> : null}
    </div>
  );
}

function remainingPlanLabel(daysUntilDue: number) {
  if (daysUntilDue <= 0) return "Vence hoje";
  if (daysUntilDue === 1) return "1 dia restante";
  return `${daysUntilDue} dias restantes`;
}

