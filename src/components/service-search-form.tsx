"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Building2, CarFront, Cpu, Navigation, PawPrint, Search, Sparkles } from "lucide-react";
import { brazilStates, citiesByState } from "@/lib/constants";
import { formatCep } from "@/lib/formatters";
import { audienceForService, defaultServiceCategories, isServiceAudience, serviceAudiences, type ServiceAudience, type ServiceCategoryOption } from "@/lib/service-catalog";
import { ServiceCategoryIcon } from "@/components/service-category-icon";

type ServiceSearchFormProps = {
  initialAddress?: string;
  initialAudience?: string;
  initialCategory?: string;
  initialCep?: string;
  initialCity?: string;
  initialDistrict?: string;
  initialQuery?: string;
  initialRadiusKm?: string;
  initialState?: string;
};

type SearchMode = "CEP" | "PROFESSIONAL";

export function ServiceSearchForm({
  initialAddress = "",
  initialAudience = "",
  initialCategory = "",
  initialCep = "",
  initialCity = "",
  initialDistrict = "",
  initialQuery = "",
  initialRadiusKm = "10",
  initialState = ""
}: ServiceSearchFormProps) {
  const [, setMode] = useState<SearchMode>("CEP");
  const [state, setState] = useState(initialState.toUpperCase());
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const [cep, setCep] = useState(formatCep(initialCep));
  const [address, setAddress] = useState(initialAddress);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm || "10");
  const inferredAudience = audienceForService(initialCategory);
  const [audience, setAudience] = useState<ServiceAudience | "">(isServiceAudience(initialAudience) ? initialAudience : inferredAudience ?? "");
  const [category, setCategory] = useState(initialCategory);
  const [cities, setCities] = useState<string[]>(state ? citiesByState[state] ?? [] : []);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>(defaultServiceCategories);

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
    let active = true;

    async function loadCities() {
      if (!state) {
        setCities([]);
        return;
      }

      setLoadingCities(true);
      const response = await fetch(`/api/locations/cities/${state}`, { cache: "force-cache" }).catch(() => null);
      const data = await response?.json().catch(() => null);
      const nextCities = Array.isArray(data?.cities) ? data.cities : citiesByState[state] ?? [];

      if (active) {
        setCities(nextCities);
        setLoadingCities(false);
      }
    }

    loadCities();

    return () => {
      active = false;
    };
  }, [state]);

  useEffect(() => {
    let active = true;

    async function loadDistricts() {
      if (!state || !city) {
        setDistricts([]);
        return;
      }

      setLoadingDistricts(true);
      const params = new URLSearchParams({ state, city });
      const response = await fetch(`/api/locations/districts?${params.toString()}`, { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null);
      const nextDistricts = Array.isArray(data?.districts) ? data.districts : [];

      if (active) {
        setDistricts(nextDistricts);
        setLoadingDistricts(false);
      }
    }

    loadDistricts();

    return () => {
      active = false;
    };
  }, [city, state]);

  const cityOptions = useMemo(() => {
    if (!city || cities.includes(city)) return cities;
    return [city, ...cities];
  }, [cities, city]);

  const districtOptions = useMemo(() => {
    if (!district || districts.includes(district)) return districts;
    return [district, ...districts];
  }, [district, districts]);

  const filteredCategories = useMemo(() => {
    if (!audience) return [];
    return categories
      .filter((item) => item.audience === audience)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [audience, categories]);

  async function lookupCep(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setMode("CEP");
    setRadiusKm("10");

    const response = await fetch(`/api/cep-lookup/${digits}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (!response?.ok || !data?.state || !data?.city) return;

    setState(String(data.state).toUpperCase());
    setCity(String(data.city));
    setDistrict(String(data.district ?? ""));
  }

  function changeCep(value: string) {
    const formatted = formatCep(value);
    setCep(formatted);
    if (formatted.replace(/\D/g, "").length > 0) {
      setMode("CEP");
      setRadiusKm("10");
    }
  }

  function changeMode(value: SearchMode) {
    setMode(value);
    if (value === "CEP") {
      setRadiusKm("10");
    }
  }

  function changeAudience(value: string) {
    const nextAudience = isServiceAudience(value) ? value : "";
    setAudience(nextAudience);
    setCategory("");
    changeMode("PROFESSIONAL");
  }

  function changeState(value: string) {
    setState(value);
    setCity("");
    setDistrict("");
  }

  function changeCity(value: string) {
    setCity(value);
    setDistrict("");
  }

  const hasCep = cep.replace(/\D/g, "").length > 0;

  return (
    <form className="mt-6 rounded-lg border border-white/10 bg-neutral-900/95 p-4 shadow-2xl shadow-black/20" autoComplete="off">
      <input type="hidden" name="searched" value="1" />
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="category" value={category} />

      <div>
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Buscar profissional</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <section id="busca-profissao" className="scroll-mt-28 rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-yellow-300 text-black">
              <BriefcaseBusiness size={19} />
            </span>
            <div>
              <strong className="block">1. Profissão</strong>
              <span className="mt-1 block text-sm text-neutral-300">Selecione a área e a profissão que você precisa.</span>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-xs font-black uppercase text-yellow-300">Área</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {serviceAudiences.map((item) => {
                const active = audience === item.value;
                const Icon = item.value === "VEHICLE" ? CarFront : item.value === "BEAUTY" ? Sparkles : item.value === "TECHNOLOGY" ? Cpu : item.value === "PETS" ? PawPrint : Building2;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => changeAudience(item.value)}
                    className={`grid min-h-[86px] place-items-center rounded-2xl border px-2 py-3 text-center transition hover:-translate-y-0.5 ${
                      active ? "border-emerald-300 bg-emerald-400 text-black" : "border-white/12 bg-black/60 text-white hover:border-emerald-300/55"
                    }`}
                  >
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-black/15" : "bg-emerald-400/15 text-emerald-300"}`}>
                      <Icon size={25} strokeWidth={2.6} />
                    </span>
                    <span className="mt-2 block text-xs font-black uppercase leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button className="mt-3 h-12 w-full rounded-full btn-gold">Buscar</button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-xs font-black uppercase text-yellow-300">Profissão</p>
              <label className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input name="q" defaultValue={initialQuery} onFocus={() => changeMode("PROFESSIONAL")} placeholder="Digite: mecânico, pintor, manicure..." className="input pl-10" />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {(filteredCategories.length ? filteredCategories : categories.slice(0, 12)).map((item) => {
                const active = category === item.slug;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setAudience(item.audience);
                      setCategory(active ? "" : item.slug);
                      changeMode("PROFESSIONAL");
                    }}
                    className={`grid min-h-[88px] place-items-center rounded-2xl border px-2 py-3 text-center transition hover:-translate-y-0.5 ${
                      active ? "border-emerald-300 bg-emerald-400 text-black" : "border-white/12 bg-black/60 text-white hover:border-emerald-300/55"
                    }`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-black/15" : "bg-emerald-400/15 text-emerald-300"}`}>
                      <ServiceCategoryIcon value={item.slug} size={23} strokeWidth={2.6} />
                    </span>
                    <span className="mt-2 block text-[10px] font-black uppercase leading-tight sm:text-xs">{item.name}</span>
                  </button>
                );
              })}
            </div>
            <button className="mt-3 h-12 w-full rounded-full btn-gold">Buscar</button>
          </div>
        </section>

        <section id="busca-regiao" className="scroll-mt-28 rounded-lg border border-yellow-300/25 bg-yellow-300/10 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-yellow-300 text-black">
              <Navigation size={19} />
            </span>
            <div>
              <strong className="block">2. Região / Localidade</strong>
              <span className="mt-1 block text-sm text-neutral-300">Use CEP para proximidade ou escolha Estado, Cidade e Bairro.</span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_1.6fr]">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-black uppercase text-yellow-300">Por CEP</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-yellow-300">CEP</span>
                  <input
                    name="cep"
                    value={cep}
                    onChange={(event) => changeCep(event.target.value)}
                    onBlur={(event) => lookupCep(event.currentTarget.value)}
                    onFocus={() => changeMode("CEP")}
                    placeholder="XXXXX-XXX"
                    inputMode="numeric"
                    maxLength={9}
                    autoComplete="new-password"
                    className="input"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-yellow-300">Raio</span>
                  <select name="radiusKm" value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)} onFocus={() => changeMode("CEP")} className="input">
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="15">15 km</option>
                    <option value="20">20 km</option>
                    <option value="25">25 km</option>
                    <option value="30">30 km</option>
                  </select>
                </label>
                <label className="grid gap-1.5 sm:col-span-2">
                  <span className="text-xs font-black uppercase text-yellow-300">Endereço ou referência</span>
                  <input
                    name="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    onFocus={() => changeMode("CEP")}
                    placeholder="Rua, bairro, cidade - UF"
                    autoComplete="street-address"
                    className="input"
                  />
                </label>
              </div>
            </div>

            <div className="hidden items-center justify-center text-xs font-black uppercase text-neutral-500 lg:flex">ou</div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-black uppercase text-yellow-300">Por região</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-yellow-300">Estado</span>
                  <select name="state" value={state} onChange={(event) => changeState(event.target.value)} onFocus={() => changeMode("PROFESSIONAL")} autoComplete="new-password" className="input">
                    <option value="">Todos</option>
                    {brazilStates.map((item) => (
                      <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-yellow-300">Cidade</span>
                  <select
                    name="city"
                    value={city}
                    onChange={(event) => changeCity(event.target.value)}
                    onFocus={() => changeMode("PROFESSIONAL")}
                    disabled={!state || loadingCities}
                    autoComplete="new-password"
                    className="input disabled:opacity-60"
                  >
                    <option value="">{loadingCities ? "Carregando..." : state ? "Todas" : "Escolha o estado"}</option>
                    {cityOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-yellow-300">Bairro</span>
                  <select
                    name="district"
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    onFocus={() => changeMode("PROFESSIONAL")}
                    disabled={!state || !city || loadingDistricts}
                    autoComplete="new-password"
                    className="input disabled:opacity-60"
                  >
                    <option value="">{loadingDistricts ? "Carregando..." : city ? "Todos" : "Escolha a cidade"}</option>
                    {districtOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <button className="mt-3 h-12 w-full rounded-full btn-gold">Buscar</button>
        </section>
      </div>

      {hasCep ? (
        <p className="mt-3 text-xs text-neutral-400">
          Ao informar o CEP, a busca ordena do prestador mais perto para o mais distante dentro do raio selecionado.
        </p>
      ) : null}
    </form>
  );
}

