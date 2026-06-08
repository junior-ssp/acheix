"use client";

import { useState } from "react";

const labels = {
  IN_APP: "Aviso pelo App",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "E-mail",
  PUSH: "Notificação no Celular/Navegador"
} as const;

type Channel = keyof typeof labels;

export function NotificationPreferences({ initialChannels }: { initialChannels: Channel[] }) {
  const [channels, setChannels] = useState<Channel[]>(normalizeChannels(initialChannels));
  const [message, setMessage] = useState("");

  async function save(nextChannels: Channel[]) {
    const normalized = normalizeChannels(nextChannels);
    if (!normalized.includes("WHATSAPP") || normalized.length < 3) {
      setMessage("WhatsApp é obrigatório e você precisa manter pelo menos 3 canais ativos.");
      return;
    }

    setChannels(normalized);
    setMessage("");
    const response = await fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationChannels: normalized })
    });
    const data = await response.json().catch(() => null);
    setMessage(response.ok ? "Preferência salva." : data?.error ?? "Não foi possível salvar.");
  }

  function toggle(option: Channel) {
    if (option === "WHATSAPP") {
      setMessage("WhatsApp é obrigatório para alertar o anunciante rapidamente.");
      return;
    }
    const nextChannels = channels.includes(option)
      ? channels.filter((channel) => channel !== option)
      : [...channels, option];
    void save(nextChannels);
  }

  return (
    <section className="mt-8 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <h2 className="text-lg font-black">Canais de Aviso do Anunciante</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Mantenha pelo menos 3 canais ativos. WhatsApp é obrigatório para alertas de interessados, sem revelar seu telefone ao visitante.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(labels) as Channel[]).map((option) => {
          const active = channels.includes(option);
          const locked = option === "WHATSAPP";
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className="flex h-14 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black px-4 text-left text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-80"
              aria-pressed={active}
              disabled={locked}
            >
              <span>{labels[option]}{locked ? " (obrigatório)" : ""}</span>
              <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? "bg-[#22C55E]" : "bg-red-600"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? "left-6" : "left-1"}`} />
              </span>
            </button>
          );
        })}
      </div>
      {message && <p className="mt-2 text-sm text-yellow-300">{message}</p>}
    </section>
  );
}

function normalizeChannels(channels: Channel[]) {
  const fallback: Channel[] = ["IN_APP", "PUSH", "EMAIL", "WHATSAPP"];
  const required: Channel[] = ["WHATSAPP", "IN_APP", "EMAIL"];
  return [...new Set([...(channels.length ? channels : fallback), ...required])] as Channel[];
}

