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
    <form onSubmit={submit} className="acheix-glass-panel grid gap-5 rounded-2xl p-5 shadow-[0_0_50px_rgba(250,204,21,0.1)] ring-1 ring-yellow-300/10 sm:p-6">
      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase tracking-[0.15em] text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">⭐ Título</span>
        <input name="title" required minLength={1} placeholder="Ex.: Procuro Honda Fit automático" className="filter-input !rounded-xl transition-all duration-200 focus:border-yellow-300 focus:shadow-[0_0_20px_rgba(250,204,21,0.2)]" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase tracking-[0.15em] text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">📝 Descrição</span>
        <textarea name="description" required minLength={1} rows={6} placeholder="Conte detalhes importantes para quem pode te chamar." className="filter-input !min-h-[8rem] !rounded-xl !py-3 transition-all duration-200 focus:border-yellow-300 focus:shadow-[0_0_20px_rgba(250,204,21,0.2)]" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-xs font-black uppercase tracking-[0.15em] text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">⏳ Expira em</legend>
        <div className="grid grid-cols-3 gap-2">
          {durations.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDurationDays(days)}
              className={`h-11 rounded-full text-sm font-black transition-all duration-200 ${durationDays === days ? "btn-gold shadow-[0_0_24px_rgba(255,214,0,0.4)] ring-1 ring-yellow-300/50" : "border border-yellow-300/20 bg-black/60 text-white backdrop-blur hover:border-yellow-300/70 hover:shadow-[0_0_18px_rgba(250,204,21,0.15)]"}`}
            >
              {days} dias
            </button>
          ))}
        </div>
      </fieldset>
      {message ? (
        <p className={`rounded-xl border p-3 text-sm font-bold backdrop-blur ${messageType === "success" ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.15)]" : "border-red-400/50 bg-red-500/20 text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.15)]"}`}>
          {message}
        </p>
      ) : null}
      <button disabled={busy} className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black shadow-[0_0_28px_rgba(255,214,0,0.35)] ring-1 ring-yellow-300/30 transition-all duration-200 hover:shadow-[0_0_40px_rgba(255,214,0,0.5)] disabled:cursor-not-allowed disabled:opacity-60">
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