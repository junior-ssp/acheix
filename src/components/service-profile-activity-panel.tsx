"use client";

import { useState } from "react";

type ServiceProfileActivityPanelProps = {
  initialStatus: string;
  initialLastActiveAt?: string | null;
  initialDueAt?: string | null;
  billingSummary?: {
    status: string;
    currentPeriodEndsAt: string;
    graceEndsAt: string;
    renewalPriceCents: number;
  } | null;
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  NEEDS_CONFIRMATION: "Ativo",
  PAUSED: "Pausado",
  INACTIVE: "Inativo - prioridade menor",
  ARCHIVED: "Oculto",
  DORMANT: "Não aparece nas buscas",
  CLOSED: "Encerrado"
};

export function ServiceProfileActivityPanel({ initialStatus, initialLastActiveAt, initialDueAt, billingSummary }: ServiceProfileActivityPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [lastActiveAt, setLastActiveAt] = useState(initialLastActiveAt);
  const [dueAt, setDueAt] = useState(initialDueAt);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const needsAttention = status === "INACTIVE" || status === "ARCHIVED" || status === "DORMANT";

  async function act(action: "CONFIRM" | "PAUSE" | "CLOSE") {
    setBusy(action);
    setMessage("");
    const response = await fetch("/api/services/profile/activity", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    const data = await response.json().catch(() => null);
    setBusy("");

    if (!response.ok) {
      setMessage(data?.error ?? "Não deu para salvar agora.");
      return;
    }

    setStatus(data.profile.status);
    setLastActiveAt(data.profile.last_active_at);
    setDueAt(data.profile.activity_confirmation_due_at);
    setMessage(action === "CONFIRM" ? "Pronto. Seu perfil aparece nas buscas. Volte aqui periodicamente para confirmar que ainda atende." : "Perfil Pausado");
  }

  return (
    <section className={`mt-4 rounded-lg border p-4 ${needsAttention ? "border-yellow-300/40 bg-yellow-300/10" : "border-white/10 bg-neutral-900"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Perfil de Servicos</p>
          <h2 className="mt-1 text-lg font-black">Voce ainda atende?</h2>
          <p className="mt-1 text-sm text-neutral-300">
            Status: <strong>{statusLabels[status] ?? status}</strong>
            {lastActiveAt ? ` - confirmado em ${new Date(lastActiveAt).toLocaleDateString("pt-BR")}` : ""}
            {dueAt ? ` - ativo ate ${new Date(dueAt).toLocaleDateString("pt-BR")}` : ""}
          </p>
          {billingSummary ? (
            <p className="mt-1 text-sm text-neutral-300">
              Plano: {billingSummary.status === "TRIALING" ? "grátis por 6 meses" : "Plano PRO"} - renovação R$ {(billingSummary.renewalPriceCents / 100).toFixed(2).replace(".", ",")} por 12 meses - vence em {new Date(billingSummary.currentPeriodEndsAt).toLocaleDateString("pt-BR")} - tolerância até {new Date(billingSummary.graceEndsAt).toLocaleDateString("pt-BR")}.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={() => act("CONFIRM")} className="h-10 rounded-full px-4 text-sm btn-gold disabled:opacity-60">
            {busy === "CONFIRM" ? "Salvando..." : "Sim, Atendo"}
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => act("PAUSE")} className="h-10 rounded-full border border-white/10 px-4 text-sm font-black text-white disabled:opacity-60">
            Pausar
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => act("CLOSE")} className="h-10 rounded-full border border-red-300/30 px-4 text-sm font-black text-red-100 disabled:opacity-60">
            Encerrar
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-yellow-300">{message}</p> : null}
    </section>
  );
}
