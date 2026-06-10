"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, Plus, PlusCircle, X } from "lucide-react";
import { categories, planCatalog } from "@/lib/constants";
import { LocationFields } from "@/components/location-fields";
import { getListingDurationDays } from "@/lib/expiration-policy";
import { isSupabaseStorageConfigured, uploadListingPhoto } from "@/lib/supabase-client";
import { CurrencyInput } from "@/components/currency-input";
import { formatPlanCurrencyBRL, parseCurrencyToCents, parseFormattedInteger } from "@/lib/formatters";
import { PlanIcon } from "@/components/plan-icon";
import { VehicleFields } from "@/components/vehicle-fields";
import { isCnpjAccount, isProfessionalPlanCode } from "@/lib/plan-rules";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";

type ListingCategory = "VEHICLE" | "REAL_ESTATE";
type CreatedListing = { slug: string; title: string };
type PlanOption = (typeof planCatalog)[number];
type UploadedPhoto = { url: string; moderationToken?: string };
const listingDraftTtlMs = 15 * 60 * 1000;

export function ListingForm({
  initialCategory = "VEHICLE",
  initialPlanCode = "FREE",
  accountType = "CPF",
  cnpj = null,
  initialState = "",
  initialCity = "",
  plans = planCatalog
}: {
  initialCategory?: ListingCategory;
  initialPlanCode?: (typeof planCatalog)[number]["code"];
  accountType?: string | null;
  cnpj?: string | null;
  initialState?: string | null;
  initialCity?: string | null;
  plans?: readonly PlanOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const category = initialCategory;
  const [planOptions, setPlanOptions] = useState<readonly PlanOption[]>(plans);
  const allowedPlans = planOptions.filter((plan) => !isProfessionalPlanCode(plan.code) || isCnpjAccount({ accountType, cnpj }));
  const [listingType, setListingType] = useState<string>(categories[initialCategory][0]);
  const [planCode, setPlanCode] = useState<(typeof planCatalog)[number]["code"]>(initialPlanCode);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info">("error");
  const [createdListing, setCreatedListing] = useState<CreatedListing | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const selectedPlan = allowedPlans.find((plan) => plan.code === planCode) ?? allowedPlans[0] ?? planCatalog[0];
  const photoLimit = selectedPlan.photoLimit;
  const canSubmit = privacyAccepted && termsAccepted && !uploading && !publishing;
  const privacyAlertClassName = agreementAlertClassName(privacyAccepted);
  const termsAlertClassName = agreementAlertClassName(termsAccepted);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plans", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.plans)) setPlanOptions(data.plans);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const draft = loadListingDraft(category);
    if (draft?.category === category) {
      if (typeof draft.planCode === "string" && planCatalog.some((plan) => plan.code === draft.planCode)) {
        setPlanCode(draft.planCode as (typeof planCatalog)[number]["code"]);
      }
      if (typeof draft.listingType === "string" && draft.listingType) setListingType(draft.listingType);
      if (Array.isArray(draft.photoUrls)) setPhotoUrls(normalizeDraftPhotos(draft.photoUrls));
      if (typeof draft.privacyAccepted === "boolean") setPrivacyAccepted(draft.privacyAccepted);
      if (typeof draft.termsAccepted === "boolean") setTermsAccepted(draft.termsAccepted);
      window.setTimeout(() => restoreFormValues(formRef.current, draft.fields), 0);
      setMessageType("info");
      setMessage("Rascunho recuperado. Ele fica salvo por 15 minutos enquanto você publica.");
    }
    setDraftReady(true);
  }, [category]);

  useEffect(() => {
    if (!draftReady) return;
    saveListingDraft();
  }, [draftReady, category, planCode, listingType, photoUrls, privacyAccepted, termsAccepted]);

  useEffect(() => {
    setPhotoUrls((current) => current.slice(0, photoLimit));
  }, [photoLimit]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) return;
    if (!privacyAccepted || !termsAccepted) {
      setMessageType("error");
      setMessage("Para publicar, confirme os avisos de privacidade e aceite os Termos de Uso.");
      window.setTimeout(() => document.getElementById("listing-form-message")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    if (uploading) {
      setMessageType("info");
      setMessage("Aguarde o envio das fotos terminar antes de publicar.");
      return;
    }

    setMessage("");
    setPublishing(true);
    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries());
    const payload: any = {
      title: raw.title,
      description: String(raw.description ?? "").trim(),
      category,
      type: raw.type,
      priceCents: parseCurrencyToCents(String(raw.price ?? "")),
      city: raw.city,
      state: raw.state,
      district: raw.district || undefined,
      showPhone: false,
      showWhatsapp: false,
      planCode,
      acceptTerms: raw.acceptTerms === "on",
      photos: photoUrls.map((photo) => ({ url: photo.url, alt: raw.title, moderationToken: photo.moderationToken }))
    };

    if (hasPublicContactInText(payload.description)) {
      setPublishing(false);
      setMessageType("error");
      setMessage(publicContactDescriptionMessage);
      window.setTimeout(() => document.getElementById("listing-form-message")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    if (category === "VEHICLE") {
      payload.vehicle = {
        brand: raw.brand,
        model: raw.model,
        version: raw.version,
        fipeCode: raw.fipeCode || undefined,
        year: Number(raw.year),
        color: raw.color || undefined,
        fuel: raw.fuel || undefined,
        gearbox: raw.gearbox || undefined,
        mileageKm: parseFormattedInteger(String(raw.mileageKm ?? ""))
      };
    } else {
      payload.realEstate = {
        purpose: raw.purpose,
        bedrooms: raw.bedrooms ? Number(raw.bedrooms) : undefined,
        bathrooms: raw.bathrooms ? Number(raw.bathrooms) : undefined,
        parking: raw.parking ? Number(raw.parking) : undefined,
        areaM2: raw.areaM2 ? Number(raw.areaM2) : undefined,
        features: []
      };
    }

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.checkoutUrl) {
        clearListingDraft(category);
        window.location.href = data.checkoutUrl;
        return;
      }
      if (response.ok && data?.listing?.slug) {
        clearListingDraft(category);
        setCreatedListing({ slug: data.listing.slug, title: data.listing.title ?? String(raw.title ?? "Anúncio") });
        setMessage("");
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
        return;
      }
      setMessageType("error");
      setMessage(listingErrorMessage(data));
      window.setTimeout(() => document.getElementById("listing-form-message")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } catch {
      setMessageType("error");
      setMessage("Não foi possível publicar agora. Confira sua conexão e tente novamente.");
    } finally {
      setPublishing(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    setMessage("");
    const remainingSlots = photoLimit - photoUrls.length;
    if (remainingSlots <= 0) {
      setMessageType("error");
      setMessage(`O plano ${selectedPlan.name} permite até ${photoLimit} foto(s).`);
      return;
    }
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setMessageType("info");
      setMessage(`O plano ${selectedPlan.name} permite até ${photoLimit} foto(s). Foram adicionadas apenas as primeiras ${remainingSlots}.`);
    }
    setUploading(true);
    try {
      const uploadedPhotos = await Promise.all(selectedFiles.map(uploadListingPhoto));
      setPhotoUrls((current) => [...current, ...uploadedPhotos]);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar fotos. Confira a configuração do Supabase Storage.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setPhotoUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function saveListingDraft() {
    const form = formRef.current;
    if (!form) return;
    writeListingDraft(category, {
      category,
      planCode,
      listingType,
      photoUrls,
      privacyAccepted,
      termsAccepted,
      fields: Object.fromEntries(new FormData(form).entries())
    });
  }

  if (createdListing) {
    return (
      <section className="rounded-2xl border border-emerald-300/40 bg-emerald-500/15 p-5 text-white shadow-2xl shadow-emerald-950/20">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-400 text-black">
            <CheckCircle2 size={24} strokeWidth={2.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase text-emerald-200">Anúncio publicado</p>
            <h2 className="mt-1 text-2xl font-black">{createdListing.title}</h2>
            <p className="mt-2 text-sm text-emerald-50/90">
              Sua publicação foi criada com sucesso. Agora escolha se quer conferir como ela aparece para os visitantes ou criar outro anúncio.
            </p>
            <div className="mt-5 grid gap-2 sm:flex">
              <a href={`/anuncios/${createdListing.slug}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
                <Eye size={18} />
                Ver publicação
              </a>
              <a href={`/anunciar?category=${category}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-black text-white hover:bg-white/10">
                <PlusCircle size={18} />
                Fazer novo anúncio
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} onInput={saveListingDraft} onChange={saveListingDraft} className="grid gap-4">
      <section className="grid gap-3">
        <p className="text-sm text-neutral-400">Escolha o plano. O pagamento fica para o final.</p>
        <input type="hidden" name="planCode" value={planCode} />
        <input type="hidden" name="category" value={category} />
        <div className="grid gap-3">
          {allowedPlans.map((plan) => {
            const selected = plan.code === planCode;
            const planDurationDays = getListingDurationDays({ plan });
            const planScope = plan.listingLimit > 1 ? `${plan.listingLimit} anúncios` : `${plan.photoLimit} fotos`;
            const priceScope = plan.listingLimit > 1 ? "pacote" : "por anúncio";
            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => {
                  setPlanCode(plan.code);
                  setMessage("");
                }}
                className={`flex min-h-20 items-center gap-4 rounded-3xl border p-4 text-left transition ${
                  selected
                    ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]"
                    : "border-white/15 bg-neutral-950/70 hover:border-white/35"
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/35">
                  <PlanIcon code={plan.code} size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-lg font-black text-white">{plan.name}</strong>
                  <span className="block text-sm text-neutral-400">Até {planDurationDays} dias · {planScope}</span>
                </span>
                <span className="text-right">
                  {plan.originalPriceCents ? (
                    <span className="block text-xs font-black text-neutral-500 line-through">{money(plan.originalPriceCents)}</span>
                  ) : null}
                  <strong className={`block text-lg font-black ${plan.priceCents ? "text-yellow-300" : "text-emerald-400"}`}>
                    {plan.priceCents ? money(plan.priceCents) : "Grátis"}
                  </strong>
                  <span className="block text-xs text-neutral-400">{priceScope}</span>
                </span>
                {selected && <CheckCircle2 className="shrink-0 text-yellow-300" size={22} />}
              </button>
            );
          })}
        </div>
        {!isCnpjAccount({ accountType, cnpj }) ? (
          <p className="rounded-md border border-white/10 bg-black/30 p-3 text-sm text-neutral-300">
            Planos X Profissionais aparecem apenas para conta com CNPJ.
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        {category === "REAL_ESTATE" && (
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase text-yellow-300">Tipo de Imóvel</span>
            <select name="type" value={listingType} onChange={(event) => setListingType(event.target.value)} className="input">
              {categories.REAL_ESTATE.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
        <input name="title" required minLength={8} placeholder="Título" className="input" />
        <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CurrencyInput name="price" required placeholder="Valor" className="input" />
          <LocationFields required initialState={initialState} initialCity={initialCity} />
          <input name="district" placeholder="Bairro" className="input" />
        </div>
      </section>

      {category === "VEHICLE" ? (
        <VehicleFields vehicleSubtype={listingType} onVehicleSubtypeChange={setListingType} />
      ) : (
        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid min-w-0 content-start gap-1.5">
              <span className="text-xs font-black uppercase text-yellow-300">Finalidade</span>
              <select name="purpose" required className="input">
                <option value="">Selecione a finalidade</option>
                <option value="Venda">Venda</option>
                <option value="Locação">Locação</option>
                <option value="Temporada">Temporada</option>
              </select>
            </label>
            <input name="bedrooms" type="number" placeholder="Quartos" className="input" />
            <input name="bathrooms" type="number" placeholder="Banheiros" className="input" />
            <input name="parking" type="number" placeholder="Vagas" className="input" />
            <input name="areaM2" type="number" placeholder="Área m²" className="input" />
          </div>
        </section>
      )}

      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Descrição</span>
          <textarea name="description" placeholder="Descreva os detalhes do anúncio, se quiser" rows={5} className="input" />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <div className="grid gap-2">
          <div>
            <p className="text-xs font-black uppercase text-yellow-300">Fotos</p>
            <p className="mt-1 text-xs text-neutral-400">
              Plano {selectedPlan.name}: até {photoLimit} foto(s). No primeiro quadradinho você pode selecionar todas de uma vez.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: photoLimit }).map((_, index) => {
              const photo = photoUrls[index];
              const isFirstEmptySlot = !photo && index === photoUrls.length;
              return (
                <div key={index} className="relative aspect-square overflow-hidden rounded-xl border border-dashed border-yellow-300/45 bg-black/30">
                  {photo ? (
                    <>
                      <img src={photo.url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/75 text-white hover:bg-red-500"
                        aria-label={`Remover foto ${index + 1}`}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : isFirstEmptySlot ? (
                    <label className={`grid h-full cursor-pointer place-items-center text-yellow-300 transition hover:bg-yellow-300/10 ${!isSupabaseStorageConfigured() || uploading ? "pointer-events-none opacity-45" : ""}`}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={!isSupabaseStorageConfigured() || uploading}
                        onChange={(event) => {
                          uploadPhotos(event.currentTarget.files);
                          event.currentTarget.value = "";
                        }}
                        className="sr-only"
                      />
                      <Plus size={30} strokeWidth={2.8} />
                    </label>
                  ) : (
                    <div className="grid h-full place-items-center text-yellow-300/35">
                      <Plus size={24} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!isSupabaseStorageConfigured() && <p className="text-xs text-yellow-300">Configure Supabase Storage no .env para upload direto.</p>}
          {uploading && <p className="text-xs text-yellow-300">Enviando fotos...</p>}
          {photoUrls.length > 0 && <p className="text-xs text-emerald-400">{photoUrls.length} foto(s) adicionada(s).</p>}
        </div>
        <label className={privacyAlertClassName}>
          <input
            type="checkbox"
            name="acceptPrivacy"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            required
            className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
          />
          <span>
            Confirmo que estou ciente que meus dados, tais como: Telefone, WhatsApp, Email e outros ficarão sempre ocultos e não aparecerão para os visitantes do Sistema/App ou interessados pelo meu anúncio. No caso, os interessados por este anúncio vão clicar no botão "Estou interessado" e eu é que vou decidir se faço contato (ou não) com os possíveis interessados em meu anúncio.
          </span>
        </label>
      </section>

      <label className={termsAlertClassName}>
        <input
          type="checkbox"
          name="acceptTerms"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
          required
          className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
        />
        <span>
          Li e aceito os <a href="/termos-de-uso" className="font-black text-yellow-300">Termos de Uso</a>. Sei que preciso renovar o anúncio quando ele vencer.
        </span>
      </label>
      {message && (
        <p id="listing-form-message" className={`rounded-lg border p-3 text-sm font-bold ${messageType === "error" ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-yellow-300/40 bg-yellow-300/10 text-yellow-100"}`}>
          {message}
        </p>
      )}
      <button disabled={!canSubmit} className="h-12 rounded-md bg-brand font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
        {publishing ? "Publicando..." : uploading ? "Aguarde as fotos" : "Pagar e Publicar"}
      </button>
    </form>
  );
}

function money(cents: number) {
  return formatPlanCurrencyBRL(cents);
}

function listingErrorMessage(data: any) {
  if (typeof data?.error === "string" && data.error !== "validation_error") return data.error;
  const details = data?.details?.fieldErrors;
  if (details && typeof details === "object") {
    const first = Object.values(details).flat().find(Boolean);
    if (first) return String(first);
  }
  return "Não foi possível publicar. Confira os campos obrigatórios e tente novamente.";
}

function agreementAlertClassName(accepted: boolean) {
  return [
    "flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold leading-relaxed shadow-lg transition",
    accepted
      ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-50 shadow-emerald-950/25"
      : "border-red-300/60 bg-red-600/25 text-red-50 shadow-red-950/30 ring-1 ring-red-400/20"
  ].join(" ");
}

type ListingDraft = {
  category: ListingCategory;
  planCode: string;
  listingType: string;
  photoUrls: Array<string | UploadedPhoto>;
  privacyAccepted: boolean;
  termsAccepted: boolean;
  fields: Record<string, FormDataEntryValue>;
  expiresAt: number;
};

function listingDraftKey(category: ListingCategory) {
  return `acheix-listing-draft-${category}`;
}

function loadListingDraft(category: ListingCategory): ListingDraft | null {
  try {
    const raw = window.localStorage.getItem(listingDraftKey(category));
    if (!raw) return null;
    const draft = JSON.parse(raw) as ListingDraft;
    if (!draft.expiresAt || draft.expiresAt <= Date.now()) {
      clearListingDraft(category);
      return null;
    }
    return draft;
  } catch {
    clearListingDraft(category);
    return null;
  }
}

function normalizeDraftPhotos(values: Array<string | UploadedPhoto>) {
  return values
    .map((item) => typeof item === "string" ? { url: item } : item)
    .filter((item): item is UploadedPhoto => Boolean(item?.url));
}

function writeListingDraft(category: ListingCategory, draft: Omit<ListingDraft, "expiresAt">) {
  try {
    window.localStorage.setItem(listingDraftKey(category), JSON.stringify({ ...draft, expiresAt: Date.now() + listingDraftTtlMs }));
  } catch {
    // Alguns WebViews podem bloquear localStorage.
  }
}

function clearListingDraft(category: ListingCategory) {
  try {
    window.localStorage.removeItem(listingDraftKey(category));
  } catch {
    // Alguns WebViews podem bloquear localStorage.
  }
}

function restoreFormValues(form: HTMLFormElement | null, fields: ListingDraft["fields"] | undefined) {
  if (!form || !fields) return;
  for (const [name, value] of Object.entries(fields)) {
    const elements = form.elements.namedItem(name);
    if (!elements) continue;
    const targets = elements instanceof RadioNodeList ? Array.from(elements) : [elements];
    for (const target of targets) {
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) continue;
      if (target.type === "checkbox" && target instanceof HTMLInputElement) {
        target.checked = value === "on";
      } else if (target.type !== "file") {
        target.value = String(value ?? "");
      }
    }
  }
}

