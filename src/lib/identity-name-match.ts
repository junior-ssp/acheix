const ignoredNameTokens = new Set(["da", "de", "di", "do", "dos", "das", "e"]);

export function identityNameMatches(inputName: string | null | undefined, officialName: string | null | undefined) {
  const inputTokens = normalizeNameTokens(inputName);
  const officialTokens = normalizeNameTokens(officialName);
  if (!inputTokens.length || !officialTokens.length) return true;

  const inputNormalized = inputTokens.join(" ");
  const officialNormalized = officialTokens.join(" ");
  if (inputNormalized === officialNormalized) return true;

  const officialSet = new Set(officialTokens);
  const commonCount = inputTokens.filter((token) => officialSet.has(token)).length;
  const shortestTokenCount = Math.min(inputTokens.length, officialTokens.length);
  const coverage = shortestTokenCount ? commonCount / shortestTokenCount : 0;
  const sameFirstName = inputTokens[0] === officialTokens[0];
  const sameLastName = inputTokens[inputTokens.length - 1] === officialTokens[officialTokens.length - 1];

  if (sameFirstName && sameLastName) return true;
  if (sameFirstName && coverage >= 0.55) return true;
  if (coverage >= 0.8) return true;
  return false;
}

export function identityNameMismatchMessage() {
  return "O nome informado não corresponde ao CPF informado. Confira o nome completo e o CPF antes de continuar.";
}

function normalizeNameTokens(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ignoredNameTokens.has(token));
}
