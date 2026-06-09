"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { FileText, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { brazilStates, citiesByState } from "@/lib/constants";
import { formatCep, formatCnpj, formatPhone, onlyDigits } from "@/lib/formatters";
import { isPublicServiceContactPreference, serviceContactDisclosureItems, serviceContactDisclosureTitle, serviceContactDisclosureVersion, type ServiceContactPreference } from "@/lib/service-contact-disclosure";
import { audienceForService, defaultServiceCategories, serviceAudiences, type ServiceAudience } from "@/lib/service-catalog";
import { getServicePlan, type ServicePlanCode } from "@/lib/service-plans";
import { ServiceCategoryIcon } from "@/components/service-category-icon";

type ServiceFormUser = {
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  accountType?: string | null;
  cnpj?: string | null;
  state?: string | null;
  city?: string | null;
  district?: string | null;
  cep?: string | null;
};

type ServiceLocation = {
  cep: string;
  state: string;
  city: string;
  district: string;
  address: string;
  number: string;
};

type InitialServiceProfile = {
  type: "INDIVIDUAL" | "COMPANY";
  categories: string[];
  name: string | null;
  companyLegalName: string | null;
  companyTradeName: string | null;
  document: string | null;
  privatePhone: string | null;
  privateWhatsapp: string | null;
  state: string | null;
  city: string | null;
  district: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  contactPublicEnabled?: boolean;
  contactDisclosureAcceptedAt?: string | null;
  contactPreference?: ServiceContactPreference;
};

const emptyLocation: ServiceLocation = { cep: "", state: "", city: "", district: "", address: "", number: "" };
const draftKey = "acheix-service-profile-draft";
const contactPreferenceOptions: Array<{ value: ServiceContactPreference; label: string; description: string }> = [
  { value: "LEADS_ONLY", label: "Receber solicitações", description: "Contato oculto. O visitante envia os dados pelo Achei X." },
  { value: "PHONE", label: "Mostrar telefone", description: "Visitantes podem ver e ligar para o telefone cadastrado." },
  { value: "WHATSAPP", label: "Mostrar WhatsApp", description: "Visitantes podem abrir conversa pelo WhatsApp cadastrado." },
  { value: "BOTH", label: "Telefone e WhatsApp", description: "Mostra os dois canais e também mantém solicitações de interesse." }
];

export function ServiceForm({
  initialEnabled = false,
  hasExistingProfile = false,
  initialProfile,
  servicePlanCode = "SERVICE_FREE",
  user
}: {
  initialEnabled?: boolean;
  hasExistingProfile?: boolean;
  initialProfile?: InitialServiceProfile | null;
  servicePlanCode?: ServicePlanCode;
  user: ServiceFormUser;
}) {
  const servicePlan = getServicePlan(servicePlanCode);
  const initialCategories = initialProfile?.categories?.slice(0, 5) ?? [];
  const firstCategoryAudience = initialCategories[0] ? audienceForService(initialCategories[0]) : null;
  const initialLocations = buildInitialLocations(initialProfile, user);
  const initialCompanyName = initialProfile?.type === "COMPANY" ? initialProfile.companyTradeName ?? initialProfile.companyLegalName ?? "" : "";
  const initialPersonName = initialProfile?.name ?? user.name ?? "";
  const initialPhone = formatPhone(initialProfile?.privateWhatsapp ?? initialProfile?.privatePhone ?? user.whatsapp ?? user.phone ?? "");
  const initialCompanyDocument = initialProfile?.type === "COMPANY" && isValidCnpjValue(initialProfile.document) ? formatCnpj(initialProfile.document) : "";
  const canUsePublicContact = user.accountType === "CNPJ" || Boolean(user.cnpj);
  const initialContactPreference = canUsePublicContact ? initialProfile?.contactPreference ?? (initialProfile?.contactPublicEnabled ? "BOTH" : "LEADS_ONLY") : "LEADS_ONLY";
  const initialPublicContactEnabled = Boolean(isPublicServiceContactPreference(initialContactPreference) && initialProfile?.contactDisclosureAcceptedAt);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [contactPreference, setContactPreference] = useState<ServiceContactPreference>(initialContactPreference);
  const [contactDisclosureAccepted, setContactDisclosureAccepted] = useState(initialPublicContactEnabled);
  const [profileSaved, setProfileSaved] = useState(hasExistingProfile);
  const [type, setType] = useState<"INDIVIDUAL" | "COMPANY">(initialProfile?.type ?? "INDIVIDUAL");
  const [audience, setAudience] = useState<ServiceAudience>(firstCategoryAudience ?? "REAL_ESTATE");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [categories, setCategories] = useState(defaultServiceCategories);
  const [locations, setLocations] = useState<ServiceLocation[]>(initialLocations);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjValue, setCnpjValue] = useState(initialCompanyDocument);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/service-categories", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && Array.isArray(data?.categories)) setCategories(data.categories);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      const draft = JSON.parse(saved) as Partial<{
        enabled: boolean;
        type: "INDIVIDUAL" | "COMPANY";
        audience: ServiceAudience;
        selectedCategories: string[];
        locations: ServiceLocation[];
        companyName: string;
        cnpjValue: string;
        contactPreference: ServiceContactPreference;
      }>;
      if (typeof draft.enabled === "boolean") setEnabled(draft.enabled);
      if (draft.type === "INDIVIDUAL" || draft.type === "COMPANY") setType(draft.type);
      if (draft.audience === "VEHICLE" || draft.audience === "REAL_ESTATE") setAudience(draft.audience);
      if (Array.isArray(draft.selectedCategories)) setSelectedCategories(draft.selectedCategories.slice(0, 5));
      if (Array.isArray(draft.locations) && draft.locations.length) setLocations(draft.locations.slice(0, 5));
      if (typeof draft.companyName === "string") setCompanyName(draft.companyName);
      if (typeof draft.cnpjValue === "string" && isValidCnpjValue(draft.cnpjValue)) setCnpjValue(formatCnpj(draft.cnpjValue));
      if (!initialPublicContactEnabled && isContactPreference(draft.contactPreference)) setContactPreference(canUsePublicContact ? draft.contactPreference : "LEADS_ONLY");
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft(false);
  }, [draftReady, enabled, type, audience, selectedCategories, locations, companyName, cnpjValue, contactPreference]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter((category) => category.audience === audience)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [audience, categories]);

  function saveDraft(
    showFeedback = true,
    overrides: Partial<{
      enabled: boolean;
      type: "INDIVIDUAL" | "COMPANY";
      audience: ServiceAudience;
      selectedCategories: string[];
      locations: ServiceLocation[];
      companyName: string;
      cnpjValue: string;
      contactPreference: ServiceContactPreference;
    }> = {}
  ) {
    localStorage.setItem(draftKey, JSON.stringify({
      enabled,
      type,
      audience,
      selectedCategories,
      locations,
      companyName,
      cnpjValue,
      contactPreference,
      ...overrides,
      savedAt: new Date().toISOString()
    }));
    if (showFeedback) setMessage("Rascunho salvo neste aparelho. Você pode sair e voltar antes de publicar.");
  }

  async function toggleEnabled() {
    setMessage("");
    if (!profileSaved) {
      setEnabled((value) => !value);
      return;
    }
    const nextEnabled = !enabled;
    setToggleBusy(true);
    const response = await fetch("/api/services/profile/activity", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: nextEnabled ? "CONFIRM" : "PAUSE" })
    });
    const data = await response.json().catch(() => null);
    setToggleBusy(false);
    if (!response.ok) {
      setMessage(data?.error ?? "Não foi possível atualizar o perfil de serviços.");
      return;
    }
    setEnabled(Boolean(data?.profile?.active));
    setMessage(nextEnabled ? "Pronto. Seu perfil aparece nas buscas." : "Perfil Pausado");
  }

  function toggleCategory(slug: string) {
    setSelectedCategories((current) => {
      let next: string[];
      if (current.includes(slug)) {
        next = current.filter((item) => item !== slug);
      } else if (current.length >= servicePlan.maxCategories) {
        setMessage(`O plano ${servicePlan.name} permite selecionar no máximo ${servicePlan.maxCategories} atividades.`);
        return current;
      } else {
        next = [...current, slug];
      }
      saveDraft(false, { selectedCategories: next });
      return next;
    });
  }

  function changeType(value: "INDIVIDUAL" | "COMPANY") {
    setType(value);
    if (value === "COMPANY" && !isValidCnpjValue(cnpjValue)) {
      setCnpjValue("");
      if (!initialCompanyName) setCompanyName("");
    }
  }

  function changeAudience(value: ServiceAudience) {
    setAudience(value);
    setSelectedCategories([]);
    saveDraft(false, { audience: value, selectedCategories: [] });
  }

  function updateLocation(index: number, patch: Partial<ServiceLocation>) {
    setLocations((current) => {
      const next = current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
      saveDraft(false, { locations: next });
      return next;
    });
  }

  function addLocation() {
    setLocations((current) => {
      const next = current.length >= 5 ? current : [...current, emptyLocation];
      saveDraft(false, { locations: next });
      return next;
    });
  }

  function removeLocation(index: number) {
    setLocations((current) => {
      const next = current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index);
      saveDraft(false, { locations: next });
      return next;
    });
  }

  async function lookupCep(index: number, value: string) {
    const cep = value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    const response = await fetch(`/api/cep-lookup/${cep}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (!response?.ok) return;
    updateLocation(index, {
      cep: formatCep(cep),
      address: data.address ?? "",
      district: data.district ?? "",
      city: data.city ?? "",
      state: data.state ?? ""
    });
  }

  async function lookupCnpj(value: string) {
    const digits = onlyDigits(value);
    if (!digits) return;
    if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formatCnpj(digits)) || !isValidCnpjValue(digits)) {
      setMessage("Informe um CNPJ válido no formato XX.XXX.XXX/XXXX-XX.");
      return;
    }

    setCnpjLoading(true);
    setMessage("");
    const response = await fetch(`/api/cnpj-lookup/${digits}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    setCnpjLoading(false);
    if (!response?.ok || !data) {
      setMessage(data?.error ?? "Não foi possível consultar este CNPJ agora.");
      return;
    }

    const name = data.tradeName || data.companyName || "";
    if (name) setCompanyName(name);
    const cep = formatCep(data.cep ?? "");
    setLocations((current) => {
      const next = [...current];
      next[0] = {
        ...next[0],
        cep: cep || next[0].cep,
        state: data.state || next[0].state,
        city: data.city || next[0].city,
        district: data.district || next[0].district,
        address: data.address || next[0].address,
        number: data.number || next[0].number
      };
      saveDraft(false, { companyName: name || companyName, cnpjValue: formatCnpj(digits), locations: next });
      return next;
    });
    setMessage("CNPJ consultado. Confira os dados preenchidos automaticamente.");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const firstLocation = locations[0] ?? emptyLocation;
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("privatePhone") ?? "").trim();
    const cnpj = cnpjValue.trim();
    const wantsPublicContact = isPublicServiceContactPreference(contactPreference);
    const missing = validateBeforeSubmit(name, phone, firstLocation, selectedCategories, type, cnpj, servicePlan.maxCategories);
    if (missing) {
      setBusy(false);
      setMessage(missing);
      saveDraft(false);
      return;
    }
    if (wantsPublicContact && !contactDisclosureAccepted) {
      setBusy(false);
      setMessage("Leia e aceite o Termo de Responsabilidade para exibir telefone e WhatsApp aos visitantes.");
      return;
    }
    const payload = {
      type,
      categories: selectedCategories,
      name,
      companyLegalName: type === "COMPANY" ? name : "",
      companyTradeName: type === "COMPANY" ? name : "",
      document: type === "COMPANY" ? cnpj : "",
      description: `${name || "Prestador"} atende em ${firstLocation.city || "sua região"}.`,
      cep: firstLocation.cep,
      state: firstLocation.state,
      city: firstLocation.city,
      district: firstLocation.district,
      address: firstLocation.address,
      number: firstLocation.number,
      complement: JSON.stringify({ serviceLocations: locations }),
      privatePhone: phone,
      privateWhatsapp: phone,
      servicePlanCode,
      locations,
      contactPreference,
      publicContactEnabled: wantsPublicContact,
      contactDisclosureAccepted: wantsPublicContact ? contactDisclosureAccepted : false
    };
    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (response.ok && data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setMessage(response.ok ? "Perfil de Serviços salvo. Você continua nesta tela para revisar ou ajustar as informações." : data?.error ?? "Não foi possível salvar.");
    if (response.ok) {
      localStorage.removeItem(draftKey);
      setProfileSaved(true);
      setEnabled(true);
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900 p-3 sm:p-4">
      <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 p-4">
        <span className="min-w-0">
          <strong className="block text-lg">Aba Serviços</strong>
          <span className="text-sm text-neutral-400">{servicePlan.name}: {servicePlan.description}</span>
        </span>
        <button type="button" onClick={toggleEnabled} disabled={toggleBusy} className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 transition ${enabled ? "bg-[#22C55E]" : "bg-red-600"} disabled:opacity-60`} aria-pressed={enabled}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </label>

      {enabled ? (
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => changeType("INDIVIDUAL")} className={`rounded-lg border p-3 text-left ${type === "INDIVIDUAL" ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/25"}`}>
              <strong>Pessoa Física</strong>
              <span className="mt-1 block text-sm text-neutral-400">Autônomo ou profissional liberal.</span>
            </button>
            <button type="button" onClick={() => changeType("COMPANY")} className={`rounded-lg border p-3 text-left ${type === "COMPANY" ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/25"}`}>
              <strong>Pessoa Jurídica</strong>
              <span className="mt-1 block text-sm text-neutral-400">Empresa, loja ou prestadora com CNPJ.</span>
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-yellow-300">
              <Search size={16} />
              <strong>Habilidades ou Serviços que Executa</strong>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {serviceAudiences.map((item) => (
                <button key={item.value} type="button" onClick={() => changeAudience(item.value)} className={`rounded-md border px-3 py-2 text-sm font-black ${audience === item.value ? "border-yellow-300 bg-yellow-300 text-black" : "border-white/10 bg-black/20 text-white"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredCategories.map((category) => {
                const active = selectedCategories.includes(category.slug);
                return (
                  <button key={category.slug} type="button" onClick={() => toggleCategory(category.slug)} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${active ? "border-yellow-300 bg-yellow-300 text-black" : "border-white/10 text-neutral-200"}`}>
                    <ServiceCategoryIcon value={category.slug} size={14} />
                    {category.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-xs text-neutral-400">Selecione até {servicePlan.maxCategories} atividades. Selecionadas: {selectedCategories.length}/{servicePlan.maxCategories}.</p>
              <button type="button" onClick={() => { saveDraft(false, { selectedCategories }); setMessage("Seleção de serviços salva neste aparelho."); }} className="rounded-full border border-yellow-300/30 px-3 py-1 text-xs font-black text-yellow-300">Salvar seleção</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {type === "COMPANY" ? (
              <input name="document" required inputMode="numeric" maxLength={18} placeholder="XX.XXX.XXX/XXXX-XX" value={cnpjValue} onChange={(event) => { const next = formatCnpj(event.currentTarget.value); setCnpjValue(next); saveDraft(false, { cnpjValue: next }); }} onBlur={(event) => lookupCnpj(event.currentTarget.value)} className="input" />
            ) : null}
            <input name="name" required placeholder={type === "COMPANY" ? (cnpjLoading ? "Buscando dados do CNPJ..." : "Nome Fantasia ou Razão Social") : "Nome"} value={type === "COMPANY" ? companyName : undefined} defaultValue={type === "INDIVIDUAL" ? initialPersonName : undefined} onChange={type === "COMPANY" ? (event) => setCompanyName(event.currentTarget.value) : undefined} className="input" />
            <input name="privatePhone" required inputMode="numeric" maxLength={15} placeholder="Telefone" defaultValue={initialPhone} onChange={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); }} className="input" />
          </div>

          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-yellow-300">
              <MapPin size={16} />
              <strong>Locais de atendimento</strong>
            </div>
            <div className="mt-3 grid gap-3">
              {locations.map((location, index) => {
                const cities = location.state ? citiesByState[location.state] ?? [] : [];
                return (
                  <div key={index} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <strong className="text-sm text-white">Local {index + 1}</strong>
                      {locations.length > 1 ? (
                        <button type="button" onClick={() => removeLocation(index)} className="grid h-8 w-8 place-items-center rounded-full border border-red-400/30 text-red-200" aria-label="Remover local">
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input value={location.cep} inputMode="numeric" maxLength={9} placeholder="CEP" onChange={(event) => updateLocation(index, { cep: formatCep(event.currentTarget.value) })} onBlur={(event) => lookupCep(index, event.currentTarget.value)} className="input" />
                      <select value={location.state} onChange={(event) => updateLocation(index, { state: event.currentTarget.value, city: "", district: "" })} className="input">
                        <option value="">Estado</option>
                        {brazilStates.map((state) => <option key={state.code} value={state.code}>{state.code} - {state.name}</option>)}
                      </select>
                      <select value={location.city} onChange={(event) => updateLocation(index, { city: event.currentTarget.value, district: "" })} className="input">
                        <option value="">Cidade</option>
                        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                        {location.city && !cities.includes(location.city) ? <option value={location.city}>{location.city}</option> : null}
                      </select>
                      <input value={location.district} placeholder="Bairro" onChange={(event) => updateLocation(index, { district: event.currentTarget.value })} className="input" />
                      {type === "COMPANY" ? <input value={location.address} placeholder="Endereço" onChange={(event) => updateLocation(index, { address: event.currentTarget.value })} className="input" /> : null}
                      {type === "COMPANY" ? <input value={location.number} placeholder="Número" onChange={(event) => updateLocation(index, { number: event.currentTarget.value })} className="input" /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={addLocation} disabled={locations.length >= 5} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-black text-white disabled:opacity-50">
                <Plus size={16} /> Adicionar local
              </button>
              <button type="button" onClick={() => { saveDraft(false, { locations }); setMessage("Locais de atendimento salvos neste aparelho."); }} className="inline-flex h-10 items-center rounded-full border border-yellow-300/30 px-4 text-sm font-black text-yellow-300">
                Salvar locais
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-3 text-sm text-neutral-100">
            <div className="flex items-center gap-2 font-bold text-yellow-200">
              <FileText size={16} />
              Como deseja receber contatos?
            </div>
            <p className="mt-1 text-neutral-300">
              O botão "Tenho Interesse" fica disponível por padrão. A exibição pública de telefone ou WhatsApp exige conta profissional/CNPJ e aceite do termo.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {contactPreferenceOptions.map((option) => {
                const disabled = option.value !== "LEADS_ONLY" && !canUsePublicContact;
                const active = contactPreference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setContactPreference(option.value);
                      if (option.value === "LEADS_ONLY" && !initialPublicContactEnabled) setContactDisclosureAccepted(false);
                      saveDraft(false, { contactPreference: option.value });
                    }}
                    className={`rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-yellow-300 bg-yellow-300 text-black" : "border-white/10 bg-black/25 text-white"}`}
                  >
                    <strong className="block text-sm">{option.label}</strong>
                    <span className={`mt-1 block text-xs ${active ? "text-black/70" : "text-neutral-400"}`}>{option.description}</span>
                  </button>
                );
              })}
            </div>
            {!canUsePublicContact ? <p className="mt-2 text-xs text-neutral-400">Conta gratuita usa apenas solicitações de interesse. Para mostrar telefone ou WhatsApp, use conta CNPJ/profissional.</p> : null}

            {isPublicServiceContactPreference(contactPreference) ? (
              <div className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="max-h-56 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs leading-5 text-neutral-200">
                  <p className="font-black text-white">{serviceContactDisclosureTitle}</p>
                  <p className="mt-2">Ao ativar a opção de exibição pública de contatos, o anunciante ou prestador de serviços declara e concorda que:</p>
                  <ol className="mt-2 grid list-decimal gap-2 pl-5">
                    {serviceContactDisclosureItems.map((item) => <li key={item}>{item}</li>)}
                  </ol>
                  <p className="mt-2 text-neutral-400">Versão: {serviceContactDisclosureVersion}</p>
                </div>
                <label className="flex gap-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                  <input
                    type="checkbox"
                    checked={contactDisclosureAccepted}
                    onChange={(event) => setContactDisclosureAccepted(event.currentTarget.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
                  />
                  <span>Li, compreendi e concordo com o Termo de Responsabilidade e Autorização de Divulgação de Contatos.</span>
                </label>
              </div>
            ) : (
              <p className="mt-2 text-xs text-neutral-400">Nesse modo, o Achei X mantém seus contatos ocultos e envia os dados do interessado para você decidir se responde.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button disabled={busy || selectedCategories.length === 0} className="h-11 rounded-md px-4 btn-gold disabled:opacity-60">
              {busy ? "Salvando..." : servicePlan.code === "SERVICE_PRO" ? "Salvar e Gerar PIX" : "Salvar Perfil de Serviços"}
            </button>
            {message ? <p className="text-sm text-yellow-300">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}

function buildInitialLocations(initialProfile: InitialServiceProfile | null | undefined, user: ServiceFormUser): ServiceLocation[] {
  const fallback: ServiceLocation = {
    cep: formatCep(initialProfile?.cep ?? user.cep ?? ""),
    state: initialProfile?.state ?? user.state ?? "",
    city: initialProfile?.city ?? user.city ?? "",
    district: initialProfile?.district ?? user.district ?? "",
    address: initialProfile?.address ?? "",
    number: initialProfile?.number ?? ""
  };

  const complement = initialProfile?.complement;
  if (!complement) return [fallback];
  try {
    const parsed = JSON.parse(complement) as { serviceLocations?: ServiceLocation[] };
    if (Array.isArray(parsed.serviceLocations) && parsed.serviceLocations.length) {
      return parsed.serviceLocations.slice(0, 5).map((location) => ({
        cep: formatCep(location.cep ?? ""),
        state: location.state ?? "",
        city: location.city ?? "",
        district: location.district ?? "",
        address: location.address ?? "",
        number: location.number ?? ""
      }));
    }
  } catch {
    return [fallback];
  }
  return [fallback];
}

function isValidCnpjValue(value: string | null | undefined) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, factors: number[]) => {
    const total = factors.reduce((sum, factor, index) => sum + Number(base[index]) * factor, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12]) &&
    calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13])
  );
}

function validateBeforeSubmit(name: string, phone: string, firstLocation: ServiceLocation, selectedCategories: string[], type: "INDIVIDUAL" | "COMPANY", cnpj: string, maxCategories: number) {
  if (!selectedCategories.length) return "Selecione pelo menos um serviço.";
  if (selectedCategories.length > maxCategories) return `Este plano permite no máximo ${maxCategories} atividades.`;
  if (!name) return "Informe o nome do prestador.";
  if (phone.replace(/\D/g, "").length !== 11) return "Informe o telefone no formato (xx) XXXXX-XXXX.";
  if (type === "COMPANY" && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj)) return "Informe o CNPJ no formato XX.XXX.XXX/XXXX-XX.";
  if (type === "COMPANY" && !isValidCnpjValue(cnpj)) return "Informe um CNPJ válido.";
  if (!firstLocation.state) return "Informe o Estado do local de atendimento.";
  if (!firstLocation.city) return "Informe a Cidade do local de atendimento.";
  if (!firstLocation.district) return "Informe o Bairro do local de atendimento.";
  return "";
}

function isContactPreference(value: unknown): value is ServiceContactPreference {
  return value === "LEADS_ONLY" || value === "PHONE" || value === "WHATSAPP" || value === "BOTH";
}








