"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { categories } from "@/lib/constants";
import { formatCurrencyBRL, parseCurrencyToCents } from "@/lib/formatters";
import { CurrencyInput } from "@/components/currency-input";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";

type EditableListing = {
  slug: string;
  title: string;
  description: string;
  category: "VEHICLE" | "REAL_ESTATE";
  type: string;
  priceCents: number;
  city: string;
  state: string;
  district: string | null;
  realEstate?: { purpose: string } | null;
};

export function EditListingForm({ listing }: { listing: EditableListing }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const typeOptions = listing.category === "VEHICLE" ? categories.VEHICLE : categories.REAL_ESTATE;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries());
    const description = String(raw.description ?? "").trim();
    if (hasPublicContactInText(description)) {
      setBusy(false);
      setMessage(publicContactDescriptionMessage);
      return;
    }
    const response = await fetch(`/api/listings/${listing.slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: raw.title,
        description,
        type: raw.type,
        priceCents: parseCurrencyToCents(String(raw.price ?? "")),
        city: raw.city,
        state: String(raw.state ?? "").toUpperCase(),
        district: raw.district || null,
        purpose: listing.category === "REAL_ESTATE" ? raw.purpose : undefined
      })
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (response.ok) {
      setMessage("Anúncio atualizado.");
      window.setTimeout(() => {
        window.location.href = "/dashboard#meus-anuncios";
      }, 450);
      return;
    }
    setMessage(data?.error ?? "Não foi possível atualizar o anúncio.");
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-xs font-black uppercase text-yellow-300">Título</span>
          <input name="title" required minLength={8} defaultValue={listing.title} className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Tipo</span>
          <select name="type" required defaultValue={listing.type} className="input">
            {typeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {listing.category === "REAL_ESTATE" ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase text-yellow-300">Finalidade</span>
            <select name="purpose" required defaultValue={normalizePurpose(listing.realEstate?.purpose)} className="input">
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>
          </label>
        ) : null}
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Valor</span>
          <CurrencyInput name="price" required defaultValue={formatCurrencyBRL(listing.priceCents)} className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Cidade</span>
          <input name="city" required defaultValue={listing.city} className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">UF</span>
          <input name="state" required minLength={2} maxLength={2} defaultValue={listing.state} className="input uppercase" />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-xs font-black uppercase text-yellow-300">Bairro</span>
          <input name="district" defaultValue={listing.district ?? ""} className="input" />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-xs font-black uppercase text-yellow-300">Descrição</span>
          <textarea name="description" rows={7} defaultValue={listing.description} className="input" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} className="h-11 rounded-full px-5 text-sm btn-gold disabled:opacity-60">
          {busy ? "Salvando..." : "Salvar Alterações"}
        </button>
        <a href="/dashboard#meus-anuncios" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-black text-white">
          Voltar
        </a>
        {message ? <p className="text-sm font-bold text-yellow-300">{message}</p> : null}
      </div>
    </form>
  );
}

function normalizePurpose(value?: string | null) {
  return value?.toLowerCase().includes("loca") ? "Locação" : "Venda";
}
