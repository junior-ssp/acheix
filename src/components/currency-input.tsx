"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { formatCurrencyInput } from "@/lib/formatters";

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  name: string;
};

export function CurrencyInput({ defaultValue, className, ...props }: CurrencyInputProps) {
  const [value, setValue] = useState(defaultValue ? formatCurrencyInput(String(defaultValue)) : "");

  return (
    <input
      {...props}
      name={props.name}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => setValue(formatCurrencyInput(event.currentTarget.value))}
      className={className}
    />
  );
}
