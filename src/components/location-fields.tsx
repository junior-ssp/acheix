"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { brazilStates, citiesByState } from "@/lib/constants";

export function LocationFields({
  stateName = "state",
  cityName = "city",
  required,
  compact,
  initialState = "",
  initialCity = ""
}: {
  stateName?: string;
  cityName?: string;
  required?: boolean;
  compact?: boolean;
  initialState?: string | null;
  initialCity?: string | null;
}) {
  const [state, setState] = useState(initialState ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [cities, setCities] = useState<string[]>(() => includeCurrentCity(citiesByState[initialState ?? ""] ?? [], initialCity));
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    setState(initialState ?? "");
    setCity(initialCity ?? "");
  }, [initialState, initialCity]);

  useEffect(() => {
    let active = true;
    if (!state) {
      setCities([]);
      setLoadingCities(false);
      return () => { active = false; };
    }

    const fallback = includeCurrentCity(citiesByState[state] ?? [], city);
    setCities(fallback);
    setLoadingCities(true);
    fetch(`/api/locations/cities/${state}`, { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active) return;
        const completeList = Array.isArray(data?.cities) ? data.cities.filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim())) : [];
        setCities(includeCurrentCity(completeList.length ? completeList : fallback, city));
      })
      .catch(() => {
        if (active) setCities(fallback);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => { active = false; };
  }, [state]);

  function chooseState(value: string) {
    setState(value);
    setCity("");
  }

  return (
    <>
      <input type="hidden" name={stateName} value={state} />
      <input type="hidden" name={cityName} value={city} />
      <Picker
        label="Estado"
        value={state}
        placeholder="Estado"
        options={brazilStates.map((item) => ({ value: item.code, label: `${item.code} - ${item.name}` }))}
        onChange={chooseState}
        compact={compact}
      />
      <Picker
        label="Cidade"
        value={city}
        placeholder={loadingCities ? "Carregando cidades..." : state ? "Cidade" : "Escolha o estado"}
        options={cities.map((item) => ({ value: item, label: item }))}
        onChange={setCity}
        disabled={!state}
        compact={compact}
      />
    </>
  );
}

function includeCurrentCity(cities: string[], currentCity: string | null | undefined) {
  const current = String(currentCity ?? "").trim();
  const unique = [...new Set(cities.map((item) => item.trim()).filter(Boolean))];
  if (current && !unique.includes(current)) unique.unshift(current);
  return unique.sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function Picker({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled,
  compact,
  initialState = "",
  initialCity = ""
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  initialState?: string | null;
  initialCity?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value)?.label;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={compact ? "location-trigger-compact" : "location-trigger"}
        aria-expanded={open}
      >
        <span className={selected ? "text-white" : "text-neutral-400"}>{selected ?? placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[90] max-h-[min(18rem,calc(100vh-10rem))] overflow-y-auto rounded-2xl border border-white/15 bg-neutral-950 p-1 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-yellow-400/15 ${option.value === value ? "text-yellow-300" : "text-white"}`}
            >
              {option.label}
            </button>
          ))}
          {!options.length && <p className="px-3 py-2 text-sm text-neutral-400">Nenhuma cidade disponivel</p>}
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}


