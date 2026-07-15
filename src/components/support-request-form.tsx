"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

type SupportUser = {
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
} | null;

const categories = [
  { value: "SUPORTE", label: "Suporte geral" },
  { value: "CONTA", label: "Conta ou cadastro" },
  { value: "ANUNCIO", label: "Anúncio" },
  { value: "PAGAMENTO", label: "Pagamento" },
  { value: "APP", label: "Aplicativo" },
  { value: "OUTRO", label: "Outro assunto" }
];

export function SupportRequestForm({ user }: { user: SupportUser }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/support-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setBusy(false);

    if (!response?.ok) {
      setStatus(typeof data?.error === "string" ? data.error : "Não foi possível enviar agora.");
      return;
    }

    setSent(true);
    setStatus(typeof data?.message === "string" ? data.message : "Mensagem enviada.");
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-lg border border-white/10 bg-neutral-950 p-4">
      {user ? (
        <div className="rounded-md border border-yellow-300/30 bg-yellow-300/10 p-3 text-sm text-yellow-50">
          <p className="font-black text-yellow-300">Dados puxados da sua conta</p>
          <p className="mt-1">{user.name}{user.username ? ` · @${user.username}` : ""}</p>
          <p className="text-yellow-100/90">{user.email} · {formatPhone(user.whatsapp ?? user.phone) || "telefone não informado"}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-black text-yellow-300">
            Nome
            <input name="name" required minLength={2} className="input" autoComplete="name" />
          </label>
          <label className="grid gap-1 text-sm font-black text-yellow-300">
            E-mail
            <input name="email" required type="email" className="input" autoComplete="email" />
          </label>
          <label className="grid gap-1 text-sm font-black text-yellow-300 sm:col-span-2">
            Telefone ou WhatsApp
            <input name="phone" className="input" autoComplete="tel" placeholder="Opcional" />
          </label>
        </div>
      )}

      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <label className="grid gap-1 text-sm font-black text-yellow-300">
          Tipo
          <select name="category" className="input" defaultValue="SUPORTE">
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black text-yellow-300">
          Assunto
          <input name="subject" required minLength={4} maxLength={120} className="input" />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-black text-yellow-300">
        Mensagem
        <textarea name="message" required minLength={10} maxLength={2500} rows={7} className="input min-h-44 resize-y" />
      </label>

      {status ? (
        <p className={`rounded-md border p-3 text-sm font-bold ${sent ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-500/10 text-red-100"}`}>
          {status}
        </p>
      ) : null}

      <button disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 btn-gold disabled:opacity-60">
        <Send size={18} />
        {busy ? "Enviando..." : "Enviar para Suporte"}
      </button>
    </form>
  );
}
