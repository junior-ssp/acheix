"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export function PasswordResetRequestForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    setMessage({
      type: response.ok ? "success" : "error",
      text: data?.message ?? data?.error ?? "Não foi possível solicitar a recuperação agora."
    });
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-3 rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
      <div className="grid gap-1">
        <label htmlFor="email" className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">E-mail cadastrado</label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="Digite seu e-mail" className="input" />
      </div>
      {message ? (
        <p className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-500/10 text-red-300"}`}>
          {message.text}
        </p>
      ) : null}
      <button disabled={busy} className="h-12 rounded-md bg-brand font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? "Enviando..." : "Enviar link de recuperação"}
      </button>
      <Link href="/entrar" className="text-center text-sm font-bold text-yellow-300">
        Voltar para entrar
      </Link>
    </form>
  );
}
