"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { formatIntegerBR } from "@/lib/formatters";

type IntegerInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  name: string;
};

export function IntegerInput({ defaultValue, className, ...props }: IntegerInputProps) {
  const [value, setValue] = useState(defaultValue ? formatIntegerBR(String(defaultValue)) : "");

  return (
    <input
      {...props}
      name={props.name}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => setValue(formatIntegerBR(event.currentTarget.value))}
      className={className}
    />
  );
}
