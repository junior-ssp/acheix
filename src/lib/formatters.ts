export function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatCpf(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatCnpj(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function formatDocument(value: string | null | undefined) {
  const digits = onlyDigits(value);
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

export function formatCep(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatPhone(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatBirthDate(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatCurrencyBRL(cents: number | null | undefined) {
  const value = Number(cents ?? 0) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value).replace(/\u00a0/g, " ");
}

export function formatPlanCurrencyBRL(cents: number | null | undefined) {
  const value = Number(cents ?? 0) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value).replace(/\u00a0/g, " ");
}

export function formatCurrencyInput(value: string | number | null | undefined) {
  const digits = onlyDigits(String(value ?? ""));
  return formatCurrencyBRL(Number(digits || 0));
}

export function parseCurrencyToCents(value: string | number | null | undefined) {
  if (typeof value === "number") return Math.round(value * 100);
  const digits = onlyDigits(value);
  return digits ? Number(digits) : 0;
}

export function formatIntegerBR(value: string | number | null | undefined) {
  const digits = onlyDigits(String(value ?? ""));
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(digits));
}

export function parseFormattedInteger(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  const digits = onlyDigits(value);
  return digits ? Number(digits) : undefined;
}
