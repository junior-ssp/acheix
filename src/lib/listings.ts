export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

type SearchPart = string | number | null | undefined | Array<string | number | null | undefined | string[]>;

export function buildSearchText(parts: SearchPart[]) {
  return parts
    .flatMap((part) => Array.isArray(part) ? part : [part])
    .filter((part): part is string | number => part !== null && part !== undefined && part !== "")
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

