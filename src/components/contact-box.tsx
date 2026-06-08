"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { LogIn } from "lucide-react";

export function ContactBox({
  slug,
  authenticated
}: {
  slug: string;
  authenticated: boolean;
}) {
  const nextPath = `/anuncios/${slug}`;
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/listings/${slug}/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(data?.error ?? "Não deu para enviar agora.");
      return;
    }
    setMessage("Mensagem enviada. Agora é só aguardar.");
    event.currentTarget.reset();
  }

  if (!authenticated) {
    return (
      <div className="mt-3 grid gap-3 rounded-md border border-white/10 bg-black/30 p-3 text-sm">
        <p className="flex items-center gap-2 text-neutral-300">
          <LogIn size={16} /> Entre ou crie sua conta para mandar mensagem.
        </p>
        <a href={`/cadastro?next=${encodeURIComponent(nextPath)}`} className="inline-flex h-11 items-center justify-center rounded-md btn-gold">Criar Conta</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3">
      <textarea name="question1" required maxLength={280} rows={3} placeholder="Escreva sua mensagem" className="input" />
      <input name="question2" maxLength={160} placeholder="Melhor horário? (opcional)" className="input" />
      <input name="question3" maxLength={160} placeholder="Sua proposta? (opcional)" className="input" />
      {message && <p className="text-sm text-coral">{message}</p>}
      <button disabled={loading} className="h-11 rounded-md bg-brand font-bold text-white disabled:opacity-60">
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
