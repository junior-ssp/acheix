"use client";

import { useEffect, useMemo, useState } from "react";
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
  const cities = useMemo(() => citiesByState[state] ?? [], [state]);

  useEffect(() => {
    setState(initialState ?? "");
    setCity(initialCity ?? "");
  }, [initialState, initialCity]);

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
        placeholder={state ? "Cidade" : "Escolha o estado"}
        options={cities.map((item) => ({ value: item, label: item }))}
        onChange={setCity}
        disabled={!state}
        compact={compact}
      />
    </>
  );
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


