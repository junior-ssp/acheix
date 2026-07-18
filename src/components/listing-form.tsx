"use client";

import type { FormEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, Gamepad2, Home, Laptop, Leaf, Music, Package, PawPrint, Plus, PlusCircle, Shirt, Sparkles, Trophy, Wrench, X } from "lucide-react";
import { categories, planCatalog, productSubcategories } from "@/lib/constants";
import { LocationFields } from "@/components/location-fields";
import { getListingDurationDays } from "@/lib/expiration-policy";
import { isSupabaseStorageConfigured, uploadListingPhoto } from "@/lib/supabase-client";
import { CurrencyInput } from "@/components/currency-input";
import { formatPlanCurrencyBRL, parseCurrencyToCents, parseFormattedInteger } from "@/lib/formatters";
import { PlanIcon } from "@/components/plan-icon";
import { VehicleFields } from "@/components/vehicle-fields";
import { getTopRefreshBenefitLabel } from "@/lib/listing-top-refresh-policy";
import { getProductValuePlanRange, isPlanAllowedForCategory } from "@/lib/plan-rules";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";
import { identifyProduct, inferProductCategoryFromText } from "@/lib/product-intelligence";
import { RealEstatePurposeFields } from "@/components/real-estate-purpose-fields";
import type { RealEstatePurpose } from "@/lib/real-estate-taxonomy";

type ListingCategory = "VEHICLE" | "REAL_ESTATE" | "PRODUCT";
type CreatedListing = { slug: string; title: string; status?: string; complimentaryPublication?: boolean };
type PlanOption = (typeof planCatalog)[number];
type UploadedPhoto = { url: string; moderationToken?: string };
const listingDraftTtlMs = 24 * 60 * 60 * 1000;

export function ListingForm({
  initialCategory = "VEHICLE",
  initialPlanCode = "FREE",
  initialState = "",
  initialCity = "",
  contactPermissions = { phone: false, whatsapp: false, email: false },
  plans = planCatalog
}: {
  initialCategory?: ListingCategory;
  initialPlanCode?: (typeof planCatalog)[number]["code"];
  initialState?: string | null;
  initialCity?: string | null;
  contactPermissions?: { phone?: boolean; whatsapp?: boolean; email?: boolean };
  plans?: readonly PlanOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const productPhotosRef = useRef<HTMLElement>(null);
  const productCategoryRef = useRef<HTMLElement>(null);
  const productTitleRef = useRef<HTMLElement>(null);
  const productDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const productConditionRef = useRef<HTMLElement>(null);
  const productPriceRef = useRef<HTMLElement>(null);
  const productDeclarationRef = useRef<HTMLElement>(null);
  const category = initialCategory;
  const [planOptions, setPlanOptions] = useState<readonly PlanOption[]>(plans);
  const allowedPlans = planOptions.filter((plan) => isPlanAllowedForCategory(plan.code, category));
  const [listingType, setListingType] = useState<string>(initialCategory === "PRODUCT" ? productSubcategories[categories.PRODUCT[0]][0] : categories[initialCategory][0]);
  const [planCode, setPlanCode] = useState<(typeof planCatalog)[number]["code"]>(initialPlanCode);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info">("error");
  const [createdListing, setCreatedListing] = useState<CreatedListing | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<UploadedPhoto[]>([]);
  const [originProofUrls, setOriginProofUrls] = useState<UploadedPhoto[]>([]);
  const [productCategory, setProductCategory] = useState<(typeof categories.PRODUCT)[number]>(categories.PRODUCT[0]);
  const [uploading, setUploading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const paidAllowedPlans = category === "PRODUCT" ? allowedPlans.filter((plan) => plan.code !== "FREE") : allowedPlans;
  const selectedPlan = paidAllowedPlans.find((plan) => plan.code === planCode) ?? paidAllowedPlans[0] ?? planCatalog[1];
  const photoLimit = selectedPlan.photoLimit;
  const canSubmit = privacyAccepted && termsAccepted && !uploading && !publishing;
  const privacyAlertClassName = agreementAlertClassName(privacyAccepted);
  const termsAlertClassName = agreementAlertClassName(termsAccepted);
  const [productCondition, setProductCondition] = useState<"Novo" | "Usado">("Usado");
  const [productSuggestion, setProductSuggestion] = useState("");
  const [productCategoryTouched, setProductCategoryTouched] = useState(false);
  const [productBlockedNotice, setProductBlockedNotice] = useState(false);
  const [realEstatePurpose, setRealEstatePurpose] = useState<RealEstatePurpose | "">("");

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
      if (typeof draft.productCategory === "string" && categories.PRODUCT.includes(draft.productCategory as any)) {
        setProductCategory(draft.productCategory as (typeof categories.PRODUCT)[number]);
        setProductCategoryTouched(true);
      }
      if (Array.isArray(draft.originProofUrls)) setOriginProofUrls(normalizeDraftPhotos(draft.originProofUrls));
      if (Array.isArray(draft.photoUrls)) setPhotoUrls(normalizeDraftPhotos(draft.photoUrls));
      if (typeof draft.privacyAccepted === "boolean") setPrivacyAccepted(draft.privacyAccepted);
      if (typeof draft.termsAccepted === "boolean") setTermsAccepted(draft.termsAccepted);
      window.setTimeout(() => restoreFormValues(formRef.current, draft.fields), 0);
      setMessageType("info");
      setMessage("Rascunho recuperado. Ele fica salvo por 24 horas enquanto você publica.");
    }
    setDraftReady(true);
  }, [category]);

  useEffect(() => {
    if (!draftReady) return;
    saveListingDraft();
  }, [draftReady, category, planCode, listingType, photoUrls, originProofUrls, productCategory, privacyAccepted, termsAccepted]);

  useEffect(() => {
    setPhotoUrls((current) => current.slice(0, photoLimit));
  }, [photoLimit]);

  useEffect(() => {
    if (category !== "PRODUCT" || photoUrls.length < 1) return;
    let cancelled = false;
    identifyProduct(photoUrls).then((suggestion) => {
      if (!cancelled && suggestion.category && suggestion.confidence > 0.5 && categories.PRODUCT.includes(suggestion.category as any)) {
        const suggestedCategory = suggestion.category as (typeof categories.PRODUCT)[number];
        if (!productCategoryTouched) {
          setProductCategory(suggestedCategory);
          setListingType(suggestion.subcategory && productSubcategories[suggestedCategory].includes(suggestion.subcategory) ? suggestion.subcategory : productSubcategories[suggestedCategory][0]);
        }
        setProductSuggestion(`Categoria sugerida automaticamente: ${suggestedCategory}. Se não estiver correto, escolha outra abaixo.`);
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [category, photoUrls, productCategoryTouched]);

  useEffect(() => {
    if (category === "PRODUCT" && planCode === "FREE") {
      setPlanCode((paidAllowedPlans[0]?.code ?? "PRODUCT_MINI") as (typeof planCatalog)[number]["code"]);
    }
  }, [category, planCode, paidAllowedPlans]);

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
      showPhone: Boolean(contactPermissions.phone && raw.showPhone === "on"),
      showWhatsapp: Boolean(contactPermissions.whatsapp && raw.showWhatsapp === "on"),
      showEmail: Boolean(contactPermissions.email && raw.showEmail === "on"),
      retainChatAudit: raw.retainChatAudit === "on",
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

    if (category === "PRODUCT") {
      payload.product = {
        productCategory: raw.productCategory,
        subcategory: raw.subcategory,
        condition: raw.condition,
        brand: raw.productBrand || undefined,
        model: raw.productModel || undefined,
        serialOrImei: raw.serialOrImei || undefined,
        originProofUrls: (originProofUrls.length ? originProofUrls : photoUrls).slice(0, 3).map((photo) => photo.url),
        originDeclarationAccepted: raw.originDeclarationAccepted === "on"
      };
    } else if (category === "VEHICLE") {
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
    } else if (category === "REAL_ESTATE") {
      payload.realEstate = {
        purpose: raw.purpose,
        bedrooms: raw.bedrooms ? Number(raw.bedrooms) : undefined,
        bathrooms: raw.bathrooms ? Number(raw.bathrooms) : undefined,
        parking: raw.parking ? Number(raw.parking) : undefined,
        areaM2: raw.areaM2 ? Number(raw.areaM2) : undefined,
        features: [],
        maxGuests: raw.maxGuests ? Number(raw.maxGuests) : undefined
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
        setCreatedListing({
          slug: data.listing.slug,
          title: data.listing.title ?? String(raw.title ?? "Anúncio"),
          status: data.listing.status,
          complimentaryPublication: Boolean(data.complimentaryPublication)
        });
        setMessage("");
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
        return;
      }
      if (data?.code === "PRODUCT_BLOCKED_BY_POLICY") {
        setProductBlockedNotice(true);
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
      for (const file of selectedFiles) {
        const uploaded = await uploadListingPhoto(file);
        setPhotoUrls((current) => [...current, uploaded]);
      }
      if (category === "PRODUCT") scrollToProductStep(productCategoryRef);
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

  function scrollToProductStep(ref: RefObject<HTMLElement>) {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
  }

  async function uploadOriginProofs(files: FileList | null) {
    if (!files?.length) return;
    const remainingSlots = 3 - originProofUrls.length;
    if (remainingSlots <= 0) {
      setMessageType("error");
      setMessage("Envie no máximo 3 provas de origem.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, remainingSlots)) {
        const uploaded = await uploadListingPhoto(file, { originProof: true });
        setOriginProofUrls((current) => [...current, uploaded]);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a prova de origem.");
    } finally {
      setUploading(false);
    }
  }

  function removeOriginProof(index: number) {
    setOriginProofUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function saveListingDraft() {
    const form = formRef.current;
    if (!form) return;
    writeListingDraft(category, {
      category,
      planCode,
      listingType,
      productCategory,
      photoUrls,
      originProofUrls,
      privacyAccepted,
      termsAccepted,
      fields: Object.fromEntries(new FormData(form).entries())
    });
  }

  function applyProductCategorySuggestion(input: string) {
    if (productCategoryTouched) return;
    const suggestion = inferProductCategoryFromText(input);
    if (!suggestion) return;
    setProductCategory(suggestion.category);
    setListingType(suggestion.subcategory && productSubcategories[suggestion.category].includes(suggestion.subcategory) ? suggestion.subcategory : productSubcategories[suggestion.category][0]);
    setProductSuggestion(`Categoria sugerida automaticamente: ${suggestion.category}. Se não estiver correto, escolha outra abaixo.`);
  }

  if (createdListing) {
    const isPendingReview = createdListing.status === "PENDING_REVIEW";
    return (
      <section className="rounded-2xl border border-emerald-300/40 bg-emerald-500/15 p-5 text-white shadow-2xl shadow-emerald-950/20">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-400 text-black">
            <CheckCircle2 size={24} strokeWidth={2.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase text-emerald-200">{isPendingReview ? "Anúncio enviado para análise" : "Anúncio publicado"}</p>
            <h2 className="mt-1 text-2xl font-black">{createdListing.title}</h2>
            <p className="mt-2 text-sm text-emerald-50/90">
              {isPendingReview
                ? createdListing.complimentaryPublication
                  ? "Sua publicação foi criada sem PIX por cortesia administrativa da plataforma e está em análise antes de aparecer para os visitantes."
                  : "Sua publicação foi criada e está em análise antes de aparecer para os visitantes."
                : createdListing.complimentaryPublication
                ? "Sua publicação foi criada sem PIX por cortesia administrativa da plataforma. Para testar pagamento real, use uma conta sem cortesia/Admin."
                : "Sua publicação foi criada com sucesso. Agora escolha se quer conferir como ela aparece para os visitantes ou criar outro anúncio."}
            </p>
            <div className="mt-5 grid gap-2 sm:flex">
              <a href={isPendingReview ? "/dashboard/meus-anuncios?meus=PENDING_REVIEW#meus-anuncios" : `/anuncios/${createdListing.slug}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
                <Eye size={18} />
                {isPendingReview ? "Ver em Meus Anúncios" : "Ver publicação"}
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

  if (category === "PRODUCT") {
    const productPlans = paidAllowedPlans.filter((plan) => isPlanAllowedForCategory(plan.code, "PRODUCT"));
    const productCategories = categories.PRODUCT.map((item) => ({ label: item, Icon: productCategoryIcon(item) }));

    return (
      <form ref={formRef} onSubmit={submit} onInput={saveListingDraft} onChange={saveListingDraft} className="grid gap-4">
        {productBlockedNotice ? (
          <section className="rounded-3xl border border-red-300/45 bg-red-500/15 p-5 text-white shadow-2xl shadow-red-950/20">
            <p className="text-xs font-black uppercase text-red-200">ANUNCIO NAO PUBLICADO</p>
            <h2 className="mt-2 text-2xl font-black">Produto em análise de política</h2>
            <p className="mt-3 text-sm leading-relaxed text-red-50/90">
              Identificamos que este anúncio pode conter um produto incompatível com as Políticas de Publicação do Achei X.
              Por esse motivo, ele não foi publicado. Caso considere que houve um engano, poderá solicitar uma revisão da análise.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setProductBlockedNotice(false)} className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-black text-white hover:bg-white/10">Voltar</button>
              <a href="/fale-conosco" className="inline-flex h-11 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">Solicitar Revisão</a>
            </div>
          </section>
        ) : null}

        <input type="hidden" name="planCode" value={planCode} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="productCategory" value={productCategory} />
        <input type="hidden" name="type" value={productCategory} />
        <input type="hidden" name="subcategory" value={listingType} />
        <input type="hidden" name="condition" value={productCondition} />
        <input type="hidden" name="retainChatAudit" value="on" />

        <section className="grid gap-3 rounded-3xl border border-yellow-300/45 bg-neutral-950/80 p-4 shadow-[0_0_28px_rgba(250,204,21,0.10)]">
          <div>
            <p className="text-xs font-black uppercase text-yellow-300">Passo 1</p>
            <h2 className="mt-1 text-xl font-black text-white">Escolha seu Plano</h2>
          </div>
          <div className="grid gap-3">
            {productPlans.map((plan) => {
              const selected = plan.code === planCode;
              const planDurationDays = getListingDurationDays({ plan });
              const productPriceRange = getProductValuePlanRange(plan.code);
              return (
                <button key={plan.code} type="button" onClick={() => { setPlanCode(plan.code); scrollToProductStep(productPhotosRef); }} className={`flex min-h-20 items-center gap-4 rounded-3xl border p-4 text-left transition ${selected ? "border-yellow-400 bg-yellow-400/10" : "border-white/15 bg-black/40 hover:border-white/35"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/35"><PlanIcon code={plan.code} size={24} /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-lg font-black text-white">{plan.name}</strong>
                    <span className="block text-sm text-neutral-400">{planDurationDays} dias · até {plan.photoLimit} fotos</span>
                    {productPriceRange ? (
                      <span className="mt-1 inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-xs font-black uppercase text-amber-200">
                        Produto {productPriceRange.label}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-xs font-black text-yellow-200">{getTopRefreshBenefitLabel(plan.code)}</span>
                  </span>
                  <strong className="text-lg font-black text-yellow-300">{money(plan.priceCents)}</strong>
                  {selected ? <CheckCircle2 className="shrink-0 text-yellow-300" size={22} /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section ref={productPhotosRef} className="grid scroll-mt-24 gap-4 rounded-3xl border border-emerald-300/45 bg-neutral-950/80 p-4 shadow-[0_0_28px_rgba(16,185,129,0.10)]">
          <div>
            <p className="text-xs font-black uppercase text-emerald-300">Passo 2</p>
            <h2 className="mt-1 text-2xl font-black text-white">Adicionar Fotos</h2>
            <p className="mt-1 text-sm text-neutral-300">Plano {selectedPlan.name}: até {photoLimit} foto(s).</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:max-w-md">
            {Array.from({ length: photoLimit }).map((_, index) => {
              const photo = photoUrls[index];
              const isFirstEmptySlot = !photo && index === photoUrls.length;
              return (
                <div key={index} className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-yellow-300/45 bg-black/40">
                  {photo ? (
                    <>
                      <img src={photo.url} alt={`Foto ${index + 1}`} className="h-full w-full bg-black object-contain" />
                      <button type="button" onClick={() => removePhoto(index)} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white hover:bg-red-500" aria-label={`Remover foto ${index + 1}`}>
                        <X size={16} />
                      </button>
                    </>
                  ) : isFirstEmptySlot ? (
              <label className={`grid h-full cursor-pointer place-items-center text-emerald-300 transition hover:bg-emerald-300/10 ${!isSupabaseStorageConfigured() || uploading ? "pointer-events-none opacity-45" : ""}`}>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif" multiple disabled={!isSupabaseStorageConfigured() || uploading} onChange={(event) => { uploadPhotos(event.currentTarget.files); event.currentTarget.value = ""; }} className="sr-only" />
                      <Plus size={34} strokeWidth={2.8} />
                    </label>
                  ) : (
                    <div className="grid h-full place-items-center text-emerald-300/35"><Plus size={26} /></div>
                  )}
                </div>
              );
            })}
          </div>
          {!isSupabaseStorageConfigured() ? <p className="text-xs text-yellow-300">Configure Supabase Storage no .env para upload direto.</p> : null}
          {uploading ? <p className="text-xs text-yellow-300">Enviando fotos...</p> : null}
          {photoUrls.length ? <p className="text-xs font-bold text-emerald-300">{photoUrls.length} foto(s) adicionada(s).</p> : <p className="text-sm text-neutral-300">Adicione pelo menos 1 foto para continuar.</p>}
          {productSuggestion ? <p className="rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">{productSuggestion}</p> : null}
        </section>

        {photoUrls.length > 0 ? (
          <>
            <section ref={productCategoryRef} className="grid scroll-mt-24 gap-4 rounded-3xl border border-sky-300/45 bg-neutral-900 p-4 shadow-[0_0_28px_rgba(56,189,248,0.10)]">
              <div>
                <p className="text-xs font-black uppercase text-sky-300">Passo 3</p>
                <h2 className="mt-1 text-xl font-black text-white">Categoria</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {productCategories.map(({ label, Icon }) => {
                  const selected = productCategory === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setProductCategoryTouched(true);
                        setProductCategory(label as (typeof categories.PRODUCT)[number]);
                        setListingType(productSubcategories[label as (typeof categories.PRODUCT)[number]][0]);
                        scrollToProductStep(productTitleRef);
                      }}
                      className={`grid min-h-28 place-items-center gap-2 rounded-2xl border p-3 text-center transition ${selected ? "border-yellow-300 bg-yellow-300/20 text-yellow-50" : "border-white/10 bg-black/30 text-white hover:border-yellow-300/45"}`}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black"><Icon size={26} strokeWidth={2.7} /></span>
                      <span className="text-xs font-black leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-2">
                <p className="text-xs font-black uppercase text-sky-300">Subcategoria</p>
                <div className="flex flex-wrap gap-2">
                  {productSubcategories[productCategory].map((item) => (
                    <button key={item} type="button" onClick={() => { setListingType(item); scrollToProductStep(productTitleRef); }} className={`rounded-full border px-3 py-2 text-xs font-black ${listingType === item ? "border-sky-300 bg-sky-300 text-black" : "border-white/10 bg-black/30 text-white"}`}>{item}</button>
                  ))}
                </div>
              </div>
            </section>

            <section ref={productTitleRef} className="grid scroll-mt-24 gap-4 rounded-3xl border border-purple-300/45 bg-neutral-900 p-4 shadow-[0_0_28px_rgba(168,85,247,0.10)]">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase text-purple-300">Passo 4 · Título</span>
                <input name="title" required minLength={8} maxLength={100} placeholder="Ex: iPhone 12 128GB em ótimo estado" className="input" onBlur={(event) => {
                  const title = event.currentTarget.value.trim();
                  if (title.length >= 3) applyProductCategorySuggestion(title);
                  if (title.length >= 8) productDescriptionRef.current?.focus();
                }} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase text-purple-300">Passo 5 · Descrição</span>
                <textarea ref={productDescriptionRef} name="description" maxLength={2000} placeholder="Detalhes opcionais do produto" rows={5} className="input" onBlur={() => scrollToProductStep(productConditionRef)} />
              </label>
            </section>

            <section ref={productConditionRef} className="grid scroll-mt-24 gap-4 rounded-3xl border border-emerald-300/45 bg-neutral-900 p-4 shadow-[0_0_28px_rgba(16,185,129,0.10)]">
              <div>
                <p className="text-xs font-black uppercase text-emerald-300">Passo 6</p>
                <h2 className="mt-1 text-xl font-black text-white">Condição do Produto</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["Novo", "Usado"] as const).map((item) => (
                  <button key={item} type="button" onClick={() => { setProductCondition(item); scrollToProductStep(productPriceRef); }} className={`min-h-16 rounded-2xl border px-4 text-lg font-black ${productCondition === item ? "border-emerald-300 bg-emerald-400 text-black" : "border-white/10 bg-black/30 text-white"}`}>{item}</button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="productBrand" placeholder="Marca, se houver" className="input" />
                <input name="productModel" placeholder="Modelo, se houver" className="input" />
                <input name="serialOrImei" placeholder="IMEI ou série, uso interno" className="input" />
              </div>
            </section>

            <section ref={productPriceRef} className="grid scroll-mt-24 gap-4 rounded-3xl border border-orange-300/45 bg-neutral-900 p-4 shadow-[0_0_28px_rgba(251,146,60,0.10)]">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase text-orange-300">Passo 7 · Preço</span>
                <CurrencyInput name="price" required placeholder="R$ 0,00" className="input" />
              </label>
              <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <LocationFields initialState={initialState} initialCity={initialCity} />
                <input name="district" placeholder="Bairro" className="input" onBlur={() => scrollToProductStep(productDeclarationRef)} />
              </div>
            </section>

            <section ref={productDeclarationRef} className="grid scroll-mt-24 gap-3 rounded-3xl border border-yellow-300/45 bg-yellow-300/10 p-4 shadow-[0_0_28px_rgba(250,204,21,0.10)]">
              <p className="text-xs font-black uppercase text-yellow-300">Declaração de Licitude</p>
              <p className="text-sm leading-relaxed text-neutral-100">
                Declaro, sob minha responsabilidade, que este produto possui origem lícita, não é fruto de furto, roubo, receptação ou qualquer outra atividade ilícita, e que tenho autorização para anunciá-lo.
                Estou ciente de que anúncios que violem as políticas do Achei X poderão ser removidos, minha conta poderá sofrer restrições em caso de descumprimento das regras e o Achei X poderá colaborar com as autoridades competentes quando houver obrigação legal ou solicitação válida, conforme a legislação aplicável.
              </p>
              <label className="flex items-start gap-2 text-sm font-bold text-white">
                <input name="originDeclarationAccepted" type="checkbox" required className="mt-1 accent-yellow-300" />
                Li e concordo com a Declaração de Licitude e Responsabilidade.
              </label>
            </section>

            <label className={privacyAlertClassName}>
              <input type="checkbox" name="acceptPrivacy" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required className="mt-1 h-5 w-5 shrink-0 accent-emerald-500" />
              <span>Confirmo que estou ciente que telefone, WhatsApp e e-mail só aparecerão para usuários cadastrados se eu autorizar no meu perfil e ativar os canais neste anúncio. Posso manter tudo oculto e usar apenas o chat interno do Achei X.</span>
            </label>
            <label className={termsAlertClassName}>
              <input type="checkbox" name="acceptTerms" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required className="mt-1 h-5 w-5 shrink-0 accent-emerald-500" />
              <span>Li e aceito os <a href="/termos-de-uso" className="font-black text-yellow-300">Termos de Uso</a>. Sei que preciso renovar o anúncio quando ele vencer.</span>
            </label>
            {message ? <p id="listing-form-message" className={`rounded-lg border p-3 text-sm font-bold ${messageType === "error" ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-yellow-300/40 bg-yellow-300/10 text-yellow-100"}`}>{message}</p> : null}
            <button disabled={!canSubmit} className="h-12 rounded-md bg-brand font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
              {publishing ? "Indo para pagamento..." : uploading ? "Aguarde as fotos" : "Pagar e Publicar"}
            </button>
          </>
        ) : null}
      </form>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} onInput={saveListingDraft} onChange={saveListingDraft} className="grid gap-4">
      <section className="grid gap-3">
        <div>
          <p className="text-sm font-bold text-white">Todo plano inclui Volta ao Topo automático.</p>
          <p className="mt-1 text-sm text-neutral-400">Seu anúncio não desaparece: ele ganha novo impulso durante a validade. O pagamento fica para o final.</p>
        </div>
        <input type="hidden" name="planCode" value={planCode} />
        <input type="hidden" name="category" value={category} />
        <div className="grid gap-3">
          {paidAllowedPlans.map((plan) => {
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
                  <span className="mt-1 block max-w-full text-xs font-black text-yellow-200">
                    {getTopRefreshBenefitLabel(plan.code)}
                  </span>
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
      </section>

      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        {category === "REAL_ESTATE" ? <RealEstatePurposeFields onPurposeChange={setRealEstatePurpose} onTypeChange={setListingType} /> : null}
        <input name="title" required minLength={8} placeholder="Título" className="input" />
        <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CurrencyInput name="price" required placeholder={realEstatePurpose === "SEASON" ? "Valor da diária" : "Valor"} className="input" />
          <LocationFields initialState={initialState} initialCity={initialCity} />
          <input name="district" placeholder="Bairro" className="input" />
        </div>
      </section>

      {category === "VEHICLE" ? (
        <VehicleFields vehicleSubtype={listingType} onVehicleSubtypeChange={setListingType} />
      ) : (
        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input name="bedrooms" type="number" placeholder="Quartos" className="input" />
            <input name="bathrooms" type="number" placeholder="Banheiros" className="input" />
            <input name="parking" type="number" placeholder="Vagas" className="input" />
            <input name="areaM2" type="number" placeholder="Área m²" className="input" />
            {realEstatePurpose === "SEASON" ? <input name="maxGuests" type="number" min="1" required placeholder="Máximo de hóspedes" className="input" /> : null}
          </div>
        </section>
      )}

      <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Descrição</span>
          <textarea name="description" placeholder="Descreva os detalhes do anúncio, se quiser" rows={5} className="input" />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-4">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Contato do anúncio</p>
          <p className="mt-1 text-sm text-neutral-300">Escolha como os interessados podem falar com você.</p>
        </div>
        {contactPermissions.whatsapp ? (
          <label className="flex items-start gap-2 text-sm font-bold text-white">
            <input name="showWhatsapp" type="checkbox" className="mt-1 accent-yellow-300" />
            Liberar WHATSAPP neste anúncio
          </label>
        ) : null}
        {contactPermissions.phone ? (
          <label className="flex items-start gap-2 text-sm font-bold text-white">
            <input name="showPhone" type="checkbox" className="mt-1 accent-yellow-300" />
            Liberar TELEFONE neste anúncio
          </label>
        ) : null}
        {contactPermissions.email ? (
          <label className="flex items-start gap-2 text-sm font-bold text-white">
            <input name="showEmail" type="checkbox" className="mt-1 accent-yellow-300" />
            Liberar E-MAIL neste anúncio
          </label>
        ) : null}
        {!contactPermissions.whatsapp && !contactPermissions.phone && !contactPermissions.email ? (
          <p className="rounded-md border border-white/10 bg-black/30 p-3 text-sm text-neutral-300">
            Nenhum contato externo ativado. O chat do Achei X continua disponível.
          </p>
        ) : null}
        <label className="flex items-start gap-2 text-sm text-white">
          <input name="retainChatAudit" type="checkbox" defaultChecked className="mt-1 accent-yellow-300" />
          <span>
            <strong className="block font-bold">Guardar um registro de segurança</strong>
            <span className="mt-1 block text-xs font-normal leading-relaxed text-neutral-300">
              Se houver denúncia, golpe ou disputa, esse registro poderá ajudar o Achei X a verificar o que aconteceu. Ele não ficará visível no seu chat nem será público.
            </span>
          </span>
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
                      <img src={photo.url} alt={`Foto ${index + 1}`} className="h-full w-full bg-black object-contain" />
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
                        accept="image/jpeg,image/png,image/webp,image/avif,.heic,.heif"
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
            Confirmo que estou ciente que telefone, WhatsApp e e-mail só aparecerão para usuários cadastrados se eu autorizar no meu perfil e ativar os canais neste anúncio. Posso manter tudo oculto e usar apenas o chat interno do Achei X.
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

function productCategoryIcon(category: string) {
  const text = category.toLowerCase();
  if (/celular|inform/.test(text)) return Laptop;
  if (/eletr/.test(text)) return Sparkles;
  if (/roupas|cal/.test(text)) return Shirt;
  if (/casa|decora/.test(text)) return Home;
  if (/m[oó]veis|eletro/.test(text)) return Package;
  if (/ferrament/.test(text)) return Wrench;
  if (/esporte|lazer/.test(text)) return Trophy;
  if (/beb[eê]|crian/.test(text)) return PawPrint;
  if (/beleza|sa[uú]de|cuidados/.test(text)) return Sparkles;
  if (/pet|pets/.test(text)) return PawPrint;
  if (/pe[cç]as|acess/.test(text)) return Wrench;
  if (/games|videogame|jogo/.test(text)) return Gamepad2;
  if (/instrument|m[uú]sica/.test(text)) return Music;
  if (/jardim|constru/.test(text)) return Leaf;
  return Package;
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
  productCategory?: string;
  photoUrls: Array<string | UploadedPhoto>;
  originProofUrls?: Array<string | UploadedPhoto>;
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

