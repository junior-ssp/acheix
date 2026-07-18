"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { ImagePlus, Plus, RefreshCcw, Star, Trash2 } from "lucide-react";
import { categories } from "@/lib/constants";
import { formatCurrencyBRL, parseCurrencyToCents } from "@/lib/formatters";
import { CurrencyInput } from "@/components/currency-input";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";
import { isSupabaseStorageConfigured, uploadListingPhoto } from "@/lib/supabase-client";
import { RealEstatePurposeFields } from "@/components/real-estate-purpose-fields";
import { normalizeRealEstatePurpose, type RealEstatePurpose } from "@/lib/real-estate-taxonomy";

type EditablePhoto = {
  id?: string;
  url: string;
  alt?: string | null;
  order?: number | null;
  moderationToken?: string;
};

type EditableListing = {
  slug: string;
  title: string;
  description: string;
  category: "VEHICLE" | "REAL_ESTATE" | "PRODUCT";
  type: string;
  priceCents: number;
  city: string;
  state: string;
  district: string | null;
  showPhone?: boolean | null;
  showWhatsapp?: boolean | null;
  showEmail?: boolean | null;
  retainChatAudit?: boolean | null;
  realEstate?: { purpose: string | null; maxGuests?: number | null } | null;
  photos?: EditablePhoto[];
  plan?: { code?: string | null; name?: string | null; photoLimit?: number | null } | null;
};

export function EditListingForm({
  listing,
  contactPermissions
}: {
  listing: EditableListing;
  contactPermissions: { phone?: boolean; whatsapp?: boolean; email?: boolean };
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<EditablePhoto[]>(() => listing.photos ?? []);
  const photosRef = useRef<EditablePhoto[]>(listing.photos ?? []);
  const typeOptions = categories.VEHICLE;
  const isProduct = listing.category === "PRODUCT";
  const photoLimit = Math.max(1, Number(listing.plan?.photoLimit ?? 10));
  const planName = listing.plan?.name ?? "atual";
  const canUpload = isSupabaseStorageConfigured() && !busy && !uploading;
  const [realEstatePurpose, setRealEstatePurpose] = useState<RealEstatePurpose | "">(() => normalizeRealEstatePurpose(listing.realEstate?.purpose) ?? "");

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
        type: isProduct ? listing.type : raw.type,
        priceCents: parseCurrencyToCents(String(raw.price ?? "")),
        city: isProduct ? String(raw.city ?? "") : raw.city,
        state: String(raw.state ?? "").toUpperCase(),
        district: raw.district || null,
        showPhone: Boolean(contactPermissions.phone && raw.showPhone === "on"),
        showWhatsapp: Boolean(contactPermissions.whatsapp && raw.showWhatsapp === "on"),
        showEmail: Boolean(contactPermissions.email && raw.showEmail === "on"),
        retainChatAudit: raw.retainChatAudit === "on",
        purpose: listing.category === "REAL_ESTATE" ? raw.purpose : undefined,
        maxGuests: listing.category === "REAL_ESTATE" && raw.maxGuests ? Number(raw.maxGuests) : undefined,
        photos: photosRef.current.map((photo, order) => ({
          url: photo.url,
          alt: String(raw.title ?? photo.alt ?? `Foto ${order + 1}`),
          moderationToken: photo.moderationToken
        }))
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

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const remainingSlots = photoLimit - photos.length;
    if (remainingSlots <= 0) {
      setMessage(`O plano ${planName} permite até ${photoLimit} foto(s).`);
      return;
    }
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setMessage(`O plano ${planName} permite até ${photoLimit} foto(s). Foram adicionadas apenas as primeiras ${remainingSlots}.`);
    } else {
      setMessage("");
    }
    setUploading(true);
    try {
      const uploadedPhotos = await Promise.all(selectedFiles.map((file) => uploadListingPhoto(file)));
      updatePhotos((current) => [...current, ...uploadedPhotos]);
      setMessage(`${selectedFiles.length} foto(s) enviada(s). Clique em Salvar Alterações para publicar a troca.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar fotos.");
    } finally {
      setUploading(false);
    }
  }

  async function replacePhoto(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const uploadedPhoto = await uploadListingPhoto(file);
      updatePhotos((current) => current.map((photo, currentIndex) => currentIndex === index ? uploadedPhoto : photo));
      setMessage("Foto trocada. Clique em Salvar Alterações para publicar a troca.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível trocar a foto.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    updatePhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setMessage("Foto removida. Clique em Salvar Alterações para publicar a troca.");
  }

  function setCoverPhoto(index: number) {
    if (index <= 0) return;
    updatePhotos((current) => {
      const next = [...current];
      const [selected] = next.splice(index, 1);
      return selected ? [selected, ...next] : current;
    });
    setMessage("Capa escolhida. Clique em Salvar Alterações para publicar a troca.");
  }

  function updatePhotos(updater: (current: EditablePhoto[]) => EditablePhoto[]) {
    setPhotos((current) => {
      const next = updater(current);
      photosRef.current = next;
      return next;
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-xs font-black uppercase text-yellow-300">Título</span>
          <input name="title" required minLength={8} defaultValue={listing.title} className="input" />
        </label>
        {listing.category === "REAL_ESTATE" ? (
          <RealEstatePurposeFields initialPurpose={listing.realEstate?.purpose} initialType={listing.type} onPurposeChange={setRealEstatePurpose} />
        ) : isProduct ? (
          <input type="hidden" name="type" value={listing.type} />
        ) : (
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase text-yellow-300">Tipo</span>
            <select name="type" required defaultValue={listing.type} className="input">
              {typeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        )}
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">{realEstatePurpose === "SEASON" ? "Valor da diária" : "Valor"}</span>
          <CurrencyInput name="price" required defaultValue={formatCurrencyBRL(listing.priceCents)} className="input" />
        </label>
        {listing.category === "REAL_ESTATE" && realEstatePurpose === "SEASON" ? <label className="grid gap-1.5"><span className="text-xs font-black uppercase text-yellow-300">Máximo de hóspedes</span><input name="maxGuests" type="number" min="1" required defaultValue={listing.realEstate?.maxGuests ?? ""} className="input" /></label> : null}
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Cidade</span>
          <input name="city" required={!isProduct} defaultValue={listing.city} className="input" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">UF</span>
          <input name="state" required={!isProduct} minLength={isProduct ? undefined : 2} maxLength={2} defaultValue={listing.state} className="input uppercase" />
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

      <section className="grid gap-2 rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-3">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Contato do anúncio</p>
          <p className="mt-1 text-xs text-neutral-300">Escolha como os interessados podem falar com você.</p>
        </div>
        {contactPermissions.whatsapp ? (
          <label className="flex items-start gap-2 text-sm font-bold text-white">
            <input name="showWhatsapp" type="checkbox" defaultChecked={Boolean(listing.showWhatsapp)} className="mt-1 accent-yellow-300" />
            Liberar WHATSAPP
          </label>
        ) : null}
        {contactPermissions.phone ? (
          <label className="flex items-start gap-2 text-sm font-bold text-white">
            <input name="showPhone" type="checkbox" defaultChecked={Boolean(listing.showPhone)} className="mt-1 accent-yellow-300" />
            Liberar TELEFONE
          </label>
        ) : null}
        {contactPermissions.email ? (
          <label className="flex items-start gap-2 text-sm font-bold text-white">
            <input name="showEmail" type="checkbox" defaultChecked={Boolean(listing.showEmail)} className="mt-1 accent-yellow-300" />
            Liberar E-MAIL
          </label>
        ) : null}
        <label className="flex items-start gap-2 text-sm text-white">
          <input name="retainChatAudit" type="checkbox" defaultChecked={listing.retainChatAudit !== false} className="mt-1 accent-yellow-300" />
          <span>
            <strong className="block font-bold">Guardar um registro de segurança</strong>
            <span className="mt-1 block text-xs font-normal leading-relaxed text-neutral-300">
              Se houver denúncia, golpe ou disputa, esse registro poderá ajudar o Achei X a verificar o que aconteceu. Ele não ficará visível no seu chat nem será público.
            </span>
          </span>
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase text-yellow-300">Fotos do anúncio</p>
            <p className="mt-1 text-xs text-neutral-300">
              Plano {planName}: {photos.length}/{photoLimit} foto(s). Você pode trocar qualquer imagem já publicada.
            </p>
          </div>
          <label className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-yellow-300/35 px-4 text-xs font-black text-yellow-200 hover:bg-yellow-300/10 ${!canUpload || photos.length >= photoLimit ? "pointer-events-none opacity-50" : ""}`}>
            <Plus size={16} />
            Adicionar
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
              multiple
              disabled={!canUpload || photos.length >= photoLimit}
              onChange={(event) => {
                addPhotos(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              className="sr-only"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: photoLimit }).map((_, index) => {
            const photo = photos[index];
            return (
              <div key={photo?.url ?? index} className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-yellow-300/35 bg-neutral-950">
                {photo ? (
                  <>
                    <img src={photo.url} alt={photo.alt ?? `Foto ${index + 1}`} className="h-full w-full bg-black object-contain" />
                    {index === 0 ? (
                      <span className="absolute left-1 top-1 inline-flex h-7 items-center gap-1 rounded-md bg-yellow-300 px-2 text-[10px] font-black uppercase text-black">
                        <Star size={13} fill="currentColor" />
                        Capa
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCoverPhoto(index)}
                        disabled={busy || uploading}
                        className="absolute left-1 top-1 inline-flex h-7 items-center gap-1 rounded-md bg-black/75 px-2 text-[10px] font-black uppercase text-white hover:bg-yellow-300 hover:text-black disabled:opacity-60"
                        aria-label={`Definir foto ${index + 1} como capa`}
                      >
                        <Star size={13} />
                        Capa
                      </button>
                    )}
                    <div className="absolute inset-x-1 bottom-1 flex gap-1">
                      <label className={`grid h-9 flex-1 cursor-pointer place-items-center rounded-md bg-black/75 text-white hover:bg-yellow-300 hover:text-black ${!canUpload ? "pointer-events-none opacity-60" : ""}`} aria-label={`Trocar foto ${index + 1}`}>
                        <RefreshCcw size={16} />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
                          disabled={!canUpload}
                          onChange={(event) => {
                            replacePhoto(index, event.currentTarget.files);
                            event.currentTarget.value = "";
                          }}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        disabled={busy || uploading}
                        className="grid h-9 w-10 place-items-center rounded-md bg-black/75 text-white hover:bg-red-500 disabled:opacity-60"
                        aria-label={`Remover foto ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : index === photos.length ? (
                  <label className={`grid h-full cursor-pointer place-items-center text-yellow-300 hover:bg-yellow-300/10 ${!canUpload ? "pointer-events-none opacity-45" : ""}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
                      multiple
                      disabled={!canUpload}
                      onChange={(event) => {
                        addPhotos(event.currentTarget.files);
                        event.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                    <ImagePlus size={32} strokeWidth={2.4} />
                  </label>
                ) : (
                  <div className="grid h-full place-items-center text-yellow-300/25">
                    <ImagePlus size={26} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!isSupabaseStorageConfigured() ? <p className="text-xs text-yellow-300">Upload de fotos indisponível: Supabase Storage não configurado.</p> : null}
        {uploading ? <p className="text-xs font-bold text-yellow-300">Enviando foto...</p> : null}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy || uploading} className="h-11 rounded-full px-5 text-sm btn-gold disabled:opacity-60">
          {busy ? "Salvando..." : uploading ? "Aguarde as fotos" : "Salvar Alterações"}
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
  if (value?.toLowerCase().includes("temp")) return "Temporada";
  return value?.toLowerCase().includes("loca") ? "Locação" : "Venda";
}
