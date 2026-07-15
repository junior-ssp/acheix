"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Camera, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { brazilStates } from "@/lib/constants";
import { formatCep, formatCurrencyBRL, formatCurrencyInput, formatPhone, onlyDigits, parseCurrencyToCents } from "@/lib/formatters";
import { normalizeImageUrl } from "@/lib/image-url";
import type { ManualListingOcrHints } from "@/lib/manual-listing-ocr";
import { uploadListingPhoto } from "@/lib/supabase-client";
import {
  displayManualListingAddress,
  displayManualListingTitle,
  editableManualListingAddress,
  editableManualListingPhone,
  editableManualListingTitle,
  editableManualListingWhatsapp,
  manualListingCategories,
  manualListingDurations,
  type ManualListing,
  type ManualListingCategory
} from "@/lib/manual-listings";

type Draft = {
  id?: string;
  title: string;
  address: string;
  price: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  cep: string;
  phone: string;
  tollFree: string;
  whatsapp: string;
  whatsapp2: string;
  website: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  vidiu: string;
  category: ManualListingCategory;
  categories: ManualListingCategory[];
  durationDays: number;
  photos: string[];
};

const emptyDraft: Draft = {
  title: "",
  address: "",
  price: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  cep: "",
  phone: "",
  tollFree: "",
  whatsapp: "",
  whatsapp2: "",
  website: "",
  facebook: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  vidiu: "",
  category: "SERVICE",
  categories: ["SERVICE"],
  durationDays: 30,
  photos: []
};

const maxManualListingPhotos = 5;

export function DashboardManualListings({ initialItems }: { initialItems: ManualListing[] }) {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  function edit(item: ManualListing) {
    const editableAddress = editableManualListingAddress(item.address);
    const address = parseManualAddress(editableAddress);
    setDraft({
      id: item.id,
      title: editableManualListingTitle(item.title),
      address: editableAddress,
      price: item.priceCents ? formatCurrencyBRL(item.priceCents) : "",
      street: address.street,
      number: address.number,
      district: address.district,
      city: address.city,
      state: address.state,
      cep: address.cep,
      phone: formatFixedPhone(editableManualListingPhone(item.phone)),
      tollFree: formatTollFree(item.tollFree),
      whatsapp: formatPhone(editableManualListingWhatsapp(item.whatsapp)),
      whatsapp2: formatPhone(editableManualListingWhatsapp(item.whatsapp2)),
      website: item.website ?? "",
      facebook: item.facebook ?? "",
      instagram: item.instagram ?? "",
      youtube: item.youtube ?? "",
      tiktok: item.tiktok ?? "",
      vidiu: item.vidiu ?? "",
      category: item.category,
      categories: [item.category],
      durationDays: item.durationDays,
      photos: item.photos.map((photo) => photo.url)
    });
    setMessage("");
    setEditingItemId(item.id);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (uploading) {
      setMessage("Aguarde o envio da foto terminar antes de publicar.");
      return;
    }
    if (!draft.photos.length && !window.confirm("Publicar sem foto?")) return;
    setBusy(true);
    setMessage("");
    const url = draft.id ? `/api/manual-listings/${draft.id}` : "/api/manual-listings";
    const method = draft.id ? "PATCH" : "POST";
    const address = composeManualAddress(draft);
    try {
      const selectedCategories = draft.categories.length ? draft.categories : [draft.category];
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, category: selectedCategories[0], categories: draft.id ? [selectedCategories[0]] : selectedCategories, address, priceCents: parseOptionalPriceCents(draft.price) })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(errorMessage(data, "Não foi possível salvar."));
        return;
      }
      window.location.href = "/dashboard/anuncios-avulsos";
    } catch {
      setMessage("Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function lookupCep(value: string) {
    const cep = value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const response = await fetch(`/api/cep/${cep}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) return;
      setDraft((current) => ({
        ...current,
        cep: formatCep(data.cep ?? cep),
        street: data.address || current.street,
        district: data.district || current.district,
        city: data.city || current.city,
        state: data.state || current.state
      }));
    } finally {
      setCepLoading(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este anúncio?")) return;
    const response = await fetch(`/api/manual-listings/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("Anúncio excluído.");
      if (draft.id === id) {
        setDraft(emptyDraft);
        setEditingItemId(null);
      }
      return;
    }
    setMessage("Não foi possível excluir.");
  }

  async function uploadPhotos(files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    const remainingSlots = maxManualListingPhotos - draft.photos.length;
    if (remainingSlots <= 0) {
      setMessage("Envie no máximo 5 fotos.");
      return;
    }
    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    setUploading(true);
    setMessage(selectedFiles.length > remainingSlots ? `Vou enviar as primeiras ${remainingSlots} foto(s).` : "");
    try {
      const uploadedUrls: string[] = [];
      const detectedHints: ManualListingOcrHints[] = [];
      for (const file of filesToUpload) {
        const uploaded = await uploadListingPhoto(file, { manualListingOcr: true });
        uploadedUrls.push(uploaded.url);
        if (uploaded.manualListingHints) detectedHints.push(uploaded.manualListingHints as ManualListingOcrHints);
      }
      setDraft((current) => applyManualListingHints({
        ...current,
        photos: [...current.photos, ...uploadedUrls].slice(0, maxManualListingPhotos)
      }, detectedHints));
      if (detectedHints.some(hasManualListingHint)) {
        setMessage("Detectei alguns dados na imagem e preenchi os campos vazios.");
      } else if (uploadedUrls.length) {
        setMessage(`${uploadedUrls.length} foto(s) anexada(s).`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar as fotos.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (!draft.state) {
      setCities([]);
      return () => {
        active = false;
      };
    }

    setLoadingCities(true);
    fetch(`/api/locations/cities/${draft.state}`, { cache: "force-cache" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setCities(Array.isArray(data?.cities) ? data.cities : []);
      })
      .catch(() => {
        if (active) setCities([]);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [draft.state]);

  useEffect(() => {
    let active = true;
    if (!draft.state || !draft.city) {
      setDistricts([]);
      return () => {
        active = false;
      };
    }

    setLoadingDistricts(true);
    const params = new URLSearchParams({ state: draft.state, city: draft.city });
    fetch(`/api/locations/districts?${params.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setDistricts(Array.isArray(data?.districts) ? data.districts : []);
      })
      .catch(() => {
        if (active) setDistricts([]);
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [draft.state, draft.city]);

  useEffect(() => {
    if (!editingItemId) return;
    const target = document.getElementById(`manual-listing-${editingItemId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editingItemId]);

  const manualListingForm = (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase text-yellow-300">Fotos</span>
          <label
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border border-yellow-300/35 px-3 text-xs font-black text-yellow-100 hover:bg-yellow-300/10 ${uploading || draft.photos.length >= maxManualListingPhotos ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          >
            <ManualListingPhotoInput disabled={uploading || draft.photos.length >= maxManualListingPhotos} onFiles={uploadPhotos} />
            <Camera size={15} />
            {uploading ? "Enviando..." : `Adicionar fotos (${draft.photos.length}/5)`}
          </label>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: maxManualListingPhotos }).map((_, index) => {
            const url = draft.photos[index];
            return url ? (
              <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-yellow-300/30 bg-black">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setDraft((current) => ({ ...current, photos: current.photos.filter((item) => item !== url) }))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-white">
                  <X size={14} />
                </button>
              </div>
            ) : index === draft.photos.length ? (
              <label key={`empty-${index}`} className={`grid aspect-square place-items-center rounded-lg border border-dashed border-white/25 bg-black/35 text-neutral-300 hover:border-yellow-300/60 hover:text-yellow-100 ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
                <ManualListingPhotoInput disabled={uploading || draft.photos.length >= maxManualListingPhotos} onFiles={uploadPhotos} />
                <Camera size={24} />
              </label>
            ) : (
              <div key={`empty-${index}`} className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/15 bg-black/20 text-neutral-700">
                <Camera size={24} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Título</span>
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Valor (opcional)</span>
          <input value={draft.price} onChange={(event) => setDraft({ ...draft, price: formatCurrencyInput(event.currentTarget.value) })} inputMode="numeric" placeholder="R$ 0,00" className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Telefone Fixo</span>
          <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: formatFixedPhone(event.currentTarget.value) })} inputMode="numeric" maxLength={14} placeholder="(XX) XXXX-XXXX" className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">0800</span>
          <input value={draft.tollFree} onChange={(event) => setDraft({ ...draft, tollFree: formatTollFree(event.currentTarget.value) })} inputMode="numeric" maxLength={13} placeholder="XXXX XXX XXXX" className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Whatsapp 1</span>
          <input value={draft.whatsapp} onChange={(event) => setDraft({ ...draft, whatsapp: formatPhone(event.currentTarget.value) })} inputMode="numeric" maxLength={15} placeholder="(XX) XXXXX-XXXX" className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Whatsapp 2</span>
          <input value={draft.whatsapp2} onChange={(event) => setDraft({ ...draft, whatsapp2: formatPhone(event.currentTarget.value) })} inputMode="numeric" maxLength={15} placeholder="(XX) XXXXX-XXXX" className="input" />
        </label>
      </div>
      <div className="grid gap-3 rounded-lg border border-yellow-300/20 bg-black/20 p-3">
        <span className="text-xs font-black uppercase text-yellow-300">Endereço</span>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-neutral-300">CEP</span>
            <input
              value={draft.cep}
              onBlur={(event) => void lookupCep(event.currentTarget.value)}
              onChange={(event) => {
                const nextCep = formatCep(event.currentTarget.value);
                setDraft({ ...draft, cep: nextCep });
                if (nextCep.replace(/\D/g, "").length === 8) void lookupCep(nextCep);
              }}
              inputMode="numeric"
              maxLength={9}
              placeholder={cepLoading ? "Buscando CEP..." : "CEP"}
              className="input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Rua/Av.</span>
            <input value={draft.street} onChange={(event) => setDraft({ ...draft, street: event.currentTarget.value })} className="input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Número</span>
            <input value={draft.number} onChange={(event) => setDraft({ ...draft, number: event.currentTarget.value })} className="input" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Estado</span>
            <select
              value={draft.state}
              onChange={(event) => setDraft({ ...draft, state: event.currentTarget.value, city: "", district: "" })}
              className="input"
            >
              <option value="">Escolha o estado</option>
              {brazilStates.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Cidade</span>
            <ManualCityField
              value={draft.city}
              onChange={(city) => setDraft({ ...draft, city, district: "" })}
              placeholder={draft.state ? (loadingCities ? "Carregando cidades..." : "Escolha ou digite") : "Escolha o estado"}
              disabled={!draft.state}
              cities={cities}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-neutral-300">Bairro</span>
            <input
              list="manualListingDistricts"
              value={draft.district}
              onChange={(event) => setDraft({ ...draft, district: event.currentTarget.value })}
              placeholder={draft.city ? (loadingDistricts ? "Carregando bairros..." : "Escolha ou digite") : "Escolha a cidade"}
              className="input"
              disabled={!draft.city}
            />
            <datalist id="manualListingDistricts">
              {districts.map((district) => (
                <option key={district} value={district} />
              ))}
            </datalist>
          </label>
        </div>
      </div>
      <label className="grid gap-1.5">
        <span className="text-xs font-black uppercase text-yellow-300">Site</span>
        <input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.currentTarget.value })} placeholder="https://site.com.br" className="input" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Facebook</span>
          <input value={draft.facebook} onChange={(event) => setDraft({ ...draft, facebook: event.currentTarget.value })} placeholder="https://facebook.com/..." className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Instagram</span>
          <input value={draft.instagram} onChange={(event) => setDraft({ ...draft, instagram: event.currentTarget.value })} placeholder="https://instagram.com/..." className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">YouTube</span>
          <input value={draft.youtube} onChange={(event) => setDraft({ ...draft, youtube: event.currentTarget.value })} placeholder="https://youtube.com/..." className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">TikTok</span>
          <input value={draft.tiktok} onChange={(event) => setDraft({ ...draft, tiktok: event.currentTarget.value })} placeholder="https://tiktok.com/..." className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Vídiu</span>
          <input value={draft.vidiu} onChange={(event) => setDraft({ ...draft, vidiu: event.currentTarget.value })} placeholder="https://vidiu.com.br/..." className="input" />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Categoria</span>
          <div className="grid grid-cols-2 gap-2">
            {manualListingCategories.map((item) => {
              const selected = draft.categories.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDraft((current) => toggleManualListingCategory(current, item.value))}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${selected ? "border-yellow-300 bg-yellow-300 text-black" : "border-white/10 bg-black/30 text-white hover:border-yellow-300/50"}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] font-bold text-neutral-400">
            {draft.id ? "Na edição, a categoria escolhida vale para este anúncio." : "Pode escolher uma ou várias categorias. O sistema cria um anúncio avulso em cada categoria marcada."}
          </p>
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Prazo</span>
          <select value={draft.durationDays} onChange={(event) => setDraft({ ...draft, durationDays: Number(event.currentTarget.value) })} className="input">
            {manualListingDurations.map((days) => <option key={days} value={days}>{durationLabel(days)}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button disabled={busy || uploading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399] disabled:opacity-60">
          <Save size={17} />
          {busy ? "Salvando..." : draft.id ? "Salvar Alterações" : "Publicar"}
        </button>
        {draft.id ? (
          <button type="button" onClick={() => setDraft(emptyDraft)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-sm font-black text-white hover:bg-white/10">
            <X size={17} />
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );

  return (
    <section id="anuncios-avulsos" className="mt-8 scroll-mt-24 rounded-lg border border-yellow-300/20 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Anúncio Avulso</p>
          <p className="mt-1 text-sm text-neutral-400">Disponível apenas para sua conta. O público verá como anúncio normal.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(emptyDraft);
            setEditingItemId(null);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm btn-gold"
        >
          <Plus size={17} />
          Novo
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-sm font-bold text-yellow-100">
          {message}
        </p>
      ) : null}

      {!editingItemId ? manualListingForm : null}

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} id={`manual-listing-${item.id}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-neutral-950">
                  {item.photos[0] ? (
                    <Image
                      src={normalizeImageUrl(item.photos[0].url)}
                      alt={item.photos[0].alt ?? displayManualListingTitle(item.title)}
                      fill
                      sizes="96px"
                      quality={60}
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs font-bold text-neutral-400">Sem foto</div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black">{displayManualListingTitle(item.title)}</h3>
                  {item.priceCents ? <p className="mt-1 font-black text-yellow-300">{formatCurrencyBRL(item.priceCents)}</p> : null}
                  <p className="mt-1 text-sm text-neutral-300">{[categoryLabel(item.category), displayManualListingAddress(item.address)].filter(Boolean).join(" · ")}</p>
                  {item.whatsapp || item.whatsapp2 || item.phone || item.tollFree ? (
                    <p className="mt-2 text-xs text-neutral-400">
                      {item.phone ? `Fixo: ${item.phone}` : null}
                      {item.phone && (item.tollFree || item.whatsapp || item.whatsapp2) ? " · " : null}
                      {item.tollFree ? `0800: ${item.tollFree}` : null}
                      {item.tollFree && (item.whatsapp || item.whatsapp2) ? " · " : null}
                      {item.whatsapp ? `Whatsapp 1: ${item.whatsapp}` : null}
                      {item.whatsapp && item.whatsapp2 ? " · " : null}
                      {item.whatsapp2 ? `Whatsapp 2: ${item.whatsapp2}` : null}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs font-bold text-neutral-400">Expira em {new Date(item.expiresAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-200">
                {new Date(item.expiresAt).getTime() > Date.now() ? "Ativo" : "Expirado"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => edit(item)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-yellow-300/40 px-4 text-sm font-black text-yellow-200 hover:bg-yellow-300/10">
                <Pencil size={17} />
                Editar
              </button>
              <button type="button" onClick={() => void remove(item.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-400/30 px-4 text-sm font-black text-red-200 hover:bg-red-500/10">
                <Trash2 size={17} />
                Excluir
              </button>
            </div>
            {editingItemId === item.id ? manualListingForm : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ManualCityField({
  value,
  onChange,
  placeholder,
  disabled,
  cities
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder: string;
  disabled: boolean;
  cities: string[];
}) {
  const [focused, setFocused] = useState(false);
  const needle = normalizeLocationSearch(value);
  const suggestions = cities
    .filter((city) => !needle || normalizeLocationSearch(city).includes(needle))
    .slice(0, 6);

  return (
    <div className="relative">
      <input
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="input"
        disabled={disabled}
        autoComplete="off"
      />
      {focused && !disabled && suggestions.length ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-[100] max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-neutral-950 p-1 shadow-2xl">
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(city);
                setFocused(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-white hover:bg-yellow-300/15"
            >
              {city}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeLocationSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function ManualListingPhotoInput({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => Promise<void> }) {
  return (
    <input
      type="file"
      accept="image/*"
      multiple
      disabled={disabled}
      className="sr-only"
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        if (files.length) void onFiles(files);
      }}
    />
  );
}

function durationLabel(days: number) {
  if (days === 180) return "6 meses";
  if (days === 365) return "1 ano";
  return `${days} dias`;
}

function categoryLabel(category: ManualListingCategory) {
  return manualListingCategories.find((item) => item.value === category)?.label ?? category;
}

function toggleManualListingCategory(draft: Draft, category: ManualListingCategory): Draft {
  if (draft.id) {
    return { ...draft, category, categories: [category] };
  }
  const selected = draft.categories.includes(category)
    ? draft.categories.filter((item) => item !== category)
    : [...draft.categories, category];
  const categories = selected.length ? selected : [category];
  return { ...draft, category: categories[0], categories };
}

function composeManualAddress(draft: Draft) {
  const streetNumber = [draft.street.trim(), draft.number.trim()].filter(Boolean).join(", ");
  const cityState = [draft.city.trim(), draft.state.trim().toUpperCase()].filter(Boolean).join("/");
  return [streetNumber, draft.district.trim(), cityState, draft.cep.trim()].filter(Boolean).join(" - ");
}

function parseManualAddress(address: string) {
  const parts = address.split(" - ").map((part) => part.trim());
  const [streetNumber = "", district = "", cityState = "", cep = ""] = parts;
  const streetNumberParts = streetNumber.split(",").map((part) => part.trim());
  const cityStateParts = cityState.split("/").map((part) => part.trim());
  return {
    street: streetNumberParts[0] || address,
    number: streetNumberParts.slice(1).join(", "),
    district: parts.length > 1 ? district : "",
    city: cityStateParts[0] ?? "",
    state: (cityStateParts[1] ?? "").toUpperCase(),
    cep
  };
}

function applyManualListingHints(draft: Draft, hints: ManualListingOcrHints[]): Draft {
  return hints.reduce<Draft>((current, hint) => ({
    ...current,
    phone: current.phone || formatFixedPhone(hint.phone),
    cep: current.cep || formatCep(hint.cep),
    street: current.street || hint.street || "",
    number: current.number || hint.number || "",
    district: current.district || hint.district || "",
    city: current.city || hint.city || "",
    state: current.state || (hint.state ? hint.state.toUpperCase().slice(0, 2) : "")
  }), draft);
}

function hasManualListingHint(hint: ManualListingOcrHints) {
  return Boolean(hint.phone || hint.cep || hint.street || hint.number || hint.district || hint.city || hint.state);
}

function formatFixedPhone(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}

function formatTollFree(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

function parseOptionalPriceCents(value: string) {
  return onlyDigits(value) ? parseCurrencyToCents(value) : null;
}

function errorMessage(data: any, fallback: string) {
  if (typeof data?.error === "string" && data.error !== "validation_error") return data.error;
  const details = data?.details?.fieldErrors;
  if (details && typeof details === "object") {
    const first = Object.values(details).flat().find(Boolean);
    if (first) return String(first);
  }
  return fallback;
}
