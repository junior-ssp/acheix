"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

const durations = [7, 15, 30] as const;

export function WantedRequestForm() {
  const [durationDays, setDurationDays] = useState<(typeof durations)[number]>(7);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      durationDays
    };

    try {
      const response = await fetch("/api/wanted-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => null);
      if (response.ok) {
        setMessageType("success");
        setMessage("Registrado com sucesso.");
        window.location.href = data?.dashboardUrl ?? "/dashboard#meus-procura-se";
        return;
      }
      setMessageType("error");
      setMessage(wantedRequestErrorMessage(data));
    } catch {
      setMessageType("error");
      setMessage("Não foi possível registrar agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-2xl shadow-black/30 sm:p-5">
      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase text-yellow-300">Título</span>
        <input name="title" required minLength={1} placeholder="Ex.: Procuro Honda Fit automático" className="input" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase text-yellow-300">Descrição</span>
        <textarea name="description" required minLength={1} rows={6} placeholder="Conte detalhes importantes para quem pode te chamar." className="input" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-xs font-black uppercase text-yellow-300">Expira em</legend>
        <div className="grid grid-cols-3 gap-2">
          {durations.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDurationDays(days)}
              className={`h-11 rounded-full text-sm font-black transition ${durationDays === days ? "btn-gold" : "border border-white/10 bg-black text-white hover:border-yellow-300/50"}`}
            >
              {days} dias
            </button>
          ))}
        </div>
      </fieldset>
      {message ? (
        <p className={`rounded-lg border p-3 text-sm font-bold ${messageType === "success" ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100" : "border-red-400/40 bg-red-500/10 text-red-200"}`}>
          {message}
        </p>
      ) : null}
      <button disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm btn-gold disabled:cursor-not-allowed disabled:opacity-60">
        <Search size={18} />
        {busy ? "Registrando..." : "Registrar Procura-se"}
      </button>
    </form>
  );
}

function wantedRequestErrorMessage(data: any) {
  if (typeof data?.error === "string" && data.error !== "validation_error") return data.error;
  const details = data?.details?.fieldErrors;
  if (details && typeof details === "object") {
    const first = Object.values(details).flat().find(Boolean);
    if (first) return String(first);
  }
  return "Não foi possível registrar. Confira os campos e tente novamente.";
}
