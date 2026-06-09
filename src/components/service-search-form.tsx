"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Navigation } from "lucide-react";
import { brazilStates, citiesByState } from "@/lib/constants";
import { formatCep } from "@/lib/formatters";
import { audienceForService, defaultServiceCategories, serviceAudiences, type ServiceAudience, type ServiceCategoryOption } from "@/lib/service-catalog";
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
  const [mode, setMode] = useState<SearchMode>("CEP");
  const [state, setState] = useState(initialState.toUpperCase());
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const [cep, setCep] = useState(formatCep(initialCep));
  const [address, setAddress] = useState(initialAddress);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm || "10");
  const inferredAudience = audienceForService(initialCategory);
  const [audience, setAudience] = useState<ServiceAudience | "">(initialAudience === "VEHICLE" || initialAudience === "REAL_ESTATE" ? initialAudience : inferredAudience ?? "");
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
      return;
    }
    setCep("");
  }

  function changeAudience(value: string) {
    const nextAudience = value === "VEHICLE" || value === "REAL_ESTATE" ? value : "";
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

  const useCep = mode === "CEP";

  return (
    <form className="mt-6 rounded-lg border border-white/10 bg-neutral-900/95 p-4 shadow-2xl shadow-black/20" autoComplete="off">
      <div className="grid gap-3 lg:grid-cols-2">
        <section className={`order-2 rounded-lg border p-3 ${useCep ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/25"}`}>
          <button type="button" onClick={() => changeMode("CEP")} className="flex w-full items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-yellow-300 text-black">
              <Navigation size={19} />
            </span>
            <span>
              <strong className="block">Busca por CEP</strong>
              <span className="mt-1 block text-sm text-neutral-400">Digite o CEP para ver os mais próximos primeiro.</span>
            </span>
          </button>

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
            <button className="h-12 rounded-full btn-gold sm:col-start-2">Buscar</button>
          </div>
        </section>

        <section className={`order-1 rounded-lg border p-3 ${!useCep ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-black/25"}`}>
          <button type="button" onClick={() => changeMode("PROFESSIONAL")} className="flex w-full items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/10 text-yellow-300">
              <BriefcaseBusiness size={19} />
            </span>
            <span>
              <strong className="block">Busca por Profissional</strong>
              <span className="mt-1 block text-sm text-neutral-400">Escolha a categoria e depois a profissão.</span>
            </span>
          </button>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase text-yellow-300">Categoria</span>
              <select name="audience" value={audience} onChange={(event) => changeAudience(event.target.value)} onFocus={() => changeMode("PROFESSIONAL")} autoComplete="new-password" className="input">
                <option value="">Escolha</option>
                {serviceAudiences.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase text-yellow-300">Profissão</span>
              <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} onFocus={() => changeMode("PROFESSIONAL")} disabled={!audience} autoComplete="new-password" className="input disabled:opacity-60">
                <option value="">Todas</option>
                {filteredCategories.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>

            {filteredCategories.length ? (
              <div className="flex max-h-36 flex-wrap gap-2 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2 sm:col-span-3">
                {filteredCategories.map((item) => {
                  const active = category === item.slug;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        setCategory(item.slug);
                        changeMode("PROFESSIONAL");
                      }}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${active ? "border-yellow-300 bg-yellow-300 text-black" : "border-white/10 bg-black/25 text-neutral-200"}`}
                    >
                      <ServiceCategoryIcon value={item.slug} size={14} />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase text-yellow-300">Buscar</span>
              <input name="q" defaultValue={initialQuery} onFocus={() => changeMode("PROFESSIONAL")} placeholder="Mecânico, pintor..." className="input" />
            </label>

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

            <button className="h-12 rounded-full btn-gold sm:col-start-3">Buscar</button>
          </div>
        </section>
      </div>

      {useCep ? (
        <p className="mt-3 text-xs text-neutral-400">
          Ao informar o CEP, a busca ordena do prestador mais perto para o mais distante dentro do raio selecionado.
        </p>
      ) : null}
    </form>
  );
}

