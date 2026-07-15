import { formatCep, formatPhone, onlyDigits } from "@/lib/formatters";

export type ManualListingOcrHints = {
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
};

const streetKeywords = [
  "rua",
  "r.",
  "avenida",
  "av.",
  "av ",
  "travessa",
  "alameda",
  "praça",
  "praca",
  "rodovia",
  "estrada"
];

export function extractManualListingOcrHints(text: string): ManualListingOcrHints {
  const cleanText = String(text ?? "").replace(/\r/g, "\n");
  const lines = cleanText
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const cep = extractCep(cleanText);
  const phone = extractPhone(cleanText);
  const streetLineIndex = lines.findIndex((line) => isLikelyStreetLine(line));
  const streetLine = streetLineIndex >= 0 ? lines[streetLineIndex] : "";
  const addressParts = streetLine ? parseStreetLine(streetLine) : {};
  const locationParts = parseLocationLine(lines, streetLineIndex);

  return {
    phone,
    cep,
    ...addressParts,
    ...locationParts
  };
}

function extractCep(text: string) {
  const match = text.match(/\b\d{5}[-\s.]?\d{3}\b/);
  return match ? formatCep(match[0]) : undefined;
}

function extractPhone(text: string) {
  const candidates = text.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s.]?\d{4}/g) ?? [];
  for (const candidate of candidates) {
    let digits = onlyDigits(candidate);
    if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
    if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
    if (digits.length === 10 || digits.length === 11) return formatPhone(digits);
  }
  return undefined;
}

function isLikelyStreetLine(line: string) {
  const normalized = normalize(line);
  return streetKeywords.some((keyword) => normalized.startsWith(normalize(keyword)) || normalized.includes(` ${normalize(keyword)} `));
}

function parseStreetLine(line: string): Pick<ManualListingOcrHints, "street" | "number"> {
  const withoutCep = line.replace(/\b\d{5}[-\s.]?\d{3}\b/g, "").replace(/\s+/g, " ").trim();
  const numberMatch = withoutCep.match(/(?:,\s*|\s+n[ºo]?\s*|\s+)(\d{1,6}[a-zA-Z]?)(?:\s|,|$)/i);
  const number = numberMatch?.[1] ?? "";
  const street = numberMatch
    ? withoutCep.slice(0, numberMatch.index).replace(/[,\s-]+$/g, "").trim()
    : withoutCep.replace(/\s+-\s+.*$/g, "").trim();
  return {
    street: street || undefined,
    number: number || undefined
  };
}

function parseLocationLine(lines: string[], streetLineIndex: number): Pick<ManualListingOcrHints, "district" | "city" | "state"> {
  const nearby = lines
    .slice(Math.max(0, streetLineIndex), streetLineIndex >= 0 ? streetLineIndex + 4 : 4)
    .join(" - ");
  const cityStateMatch = nearby.match(/([A-Za-zÀ-ÿ\s.'-]{3,})\s*[-/,]\s*([A-Z]{2})\b/);
  if (!cityStateMatch) return {};
  const city = cityStateMatch[1].replace(/.*\s-\s/, "").trim();
  return {
    city: city || undefined,
    state: cityStateMatch[2].toUpperCase()
  };
}

function normalize(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
