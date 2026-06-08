"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { formatCep, formatCnpj, formatCpf, formatPhone } from "@/lib/formatters";

type ProfileData = {
  name: string;
  username: string | null;
  accountType?: string | null;
  cpf: string;
  cnpj?: string | null;
  phone: string | null;
  whatsapp: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

export function ProfileForm({ user, profileCompletion }: { user: ProfileData; profileCompletion?: number }) {
  const [message, setMessage] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    setMessage(response.ok ? "Perfil atualizado." : data?.error ?? "Não foi possível salvar o perfil.");
  }

  async function lookupCep(event: React.FocusEvent<HTMLInputElement>) {
    const cep = event.currentTarget.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    const form = event.currentTarget.form;
    const response = await fetch(`/api/cep/${cep}`);
    const data = await response.json().catch(() => null);
    setCepLoading(false);
    if (!response.ok || !form) return;
    setInput(form, "address", data.address);
    setInput(form, "district", data.district);
    setInput(form, "city", data.city);
    setInput(form, "state", data.state);
    setInput(form, "complement", data.complement);
  }

  function maskInput(event: React.ChangeEvent<HTMLInputElement>, formatter: (value: string) => string) {
    event.currentTarget.value = formatter(event.currentTarget.value);
  }

  return (
    <section className="mt-8 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Perfil do Usuário</h2>
          <p className="mt-1 text-sm text-neutral-400">Defina seu nome, username, telefone, WhatsApp e endereço quando quiser.</p>
        </div>
        <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-right">
          <p className="text-xs font-black uppercase text-yellow-300">Perfil completo</p>
          <strong className="text-2xl text-white">{profileCompletion ?? 0}%</strong>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="name" required minLength={2} defaultValue={user.name} placeholder="Nome" className="input" />
        <input name="username" defaultValue={user.username ?? ""} placeholder="Username" className="input" />
        <input value={user.accountType === "CNPJ" ? "Empresa com CNPJ" : "Pessoa Física"} readOnly aria-label="Tipo de conta" className="input cursor-not-allowed opacity-80" />
        <input value={formatCpf(user.cpf)} readOnly aria-label="CPF" className="input cursor-not-allowed opacity-80" />
        {user.accountType === "CNPJ" ? (
          <input value={formatCnpj(user.cnpj ?? "")} readOnly aria-label="CNPJ" className="input cursor-not-allowed opacity-80" />
        ) : null}
        <input name="phone" inputMode="numeric" maxLength={15} onChange={(event) => maskInput(event, formatPhone)} defaultValue={formatPhone(user.phone ?? "")} placeholder="Telefone" className="input" />
        <input name="whatsapp" inputMode="numeric" maxLength={15} onChange={(event) => maskInput(event, formatPhone)} defaultValue={formatPhone(user.whatsapp ?? "")} placeholder="WhatsApp" className="input" />
        <input name="cep" inputMode="numeric" maxLength={9} onChange={(event) => maskInput(event, formatCep)} onBlur={lookupCep} defaultValue={formatCep(user.cep ?? "")} placeholder={cepLoading ? "Buscando CEP..." : "CEP"} className="input" />
        <input name="address" defaultValue={user.address ?? ""} placeholder="Endereço" className="input" />
        <input name="number" defaultValue={user.number ?? ""} placeholder="Número" className="input" />
        <input name="complement" defaultValue={user.complement ?? ""} placeholder="Complemento" className="input" />
        <input name="district" defaultValue={user.district ?? ""} placeholder="Bairro" className="input" />
        <input name="city" defaultValue={user.city ?? ""} placeholder="Cidade" className="input" />
        <input name="state" defaultValue={user.state ?? ""} placeholder="UF" maxLength={2} className="input" />
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="h-11 rounded-md px-4 btn-gold">Salvar perfil</button>
          {message && <p className="text-sm text-yellow-300">{message}</p>}
        </div>
      </form>
    </section>
  );
}

function setInput(form: HTMLFormElement, name: string, value?: string) {
  if (!value) return;
  const input = form.elements.namedItem(name) as HTMLInputElement | null;
  if (input) input.value = value;
}
