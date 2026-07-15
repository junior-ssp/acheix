"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export function PasswordResetConfirmForm({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || done || !token) return;

    setBusy(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(formData.entries()), token })
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (response.ok) setDone(true);
    setMessage({
      type: response.ok ? "success" : "error",
      text: data?.message ?? data?.error ?? "Não foi possível redefinir sua senha agora."
    });
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-3 rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
      {!token ? (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
          Link de recuperação inválido. Solicite um novo link.
        </p>
      ) : null}
      <div className="relative">
        <input name="password" type={showPassword ? "text" : "password"} required disabled={done || !token} minLength={6} autoComplete="new-password" placeholder="Nova senha" className="input disabled:opacity-60 pr-10" />
        <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="relative">
        <input name="confirmPassword" type={showPassword ? "text" : "password"} required disabled={done || !token} minLength={6} autoComplete="new-password" placeholder="Confirmar nova senha" className="input disabled:opacity-60 pr-10" />
        <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {message ? (
        <p className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-500/10 text-red-300"}`}>
          {message.text}
        </p>
      ) : null}
      {done ? (
        <Link href="/entrar" className="inline-flex h-12 items-center justify-center rounded-md bg-brand font-bold text-black">
          Entrar com nova senha
        </Link>
      ) : (
        <button disabled={busy || !token} className="h-12 rounded-md bg-brand font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>
      )}
      {!done ? <Link href="/recuperar-senha" className="text-center text-sm font-bold text-yellow-300">Solicitar novo link</Link> : null}
    </form>
  );
}
