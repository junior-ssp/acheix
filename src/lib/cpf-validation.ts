import { onlyDigits } from "@/lib/formatters";
import { isValidCpf } from "@/lib/validators";

export type CpfProviderName = "local" | "hydracpf" | "validaseguro";

export type CpfProviderResult = {
  provider: CpfProviderName;
  status: "valid" | "invalid" | "unavailable" | "unknown";
  message?: string;
  name?: string;
};

export type CpfValidationResult = {
  valid: boolean;
  cpf: string;
  provider: CpfProviderName;
  providerResults: CpfProviderResult[];
  name?: string;
  error?: string;
};

type ProviderConfig = {
  provider: Exclude<CpfProviderName, "local">;
  url?: string;
  token?: string;
  tokenHeader: string;
};

export async function validateCpfWithProviders(rawCpf: string): Promise<CpfValidationResult> {
  const cpf = onlyDigits(rawCpf);
  const providerResults: CpfProviderResult[] = [];

  if (!isValidCpf(cpf)) {
    return {
      valid: false,
      cpf,
      provider: "local",
      providerResults: [{ provider: "local", status: "invalid", message: "CPF inválido pelo algoritmo oficial." }],
      error: "Informe um CPF válido no formato XXX.XXX.XXX-XX."
    };
  }

  providerResults.push({ provider: "local", status: "valid", message: "CPF válido pelo algoritmo oficial." });

  const configs: ProviderConfig[] = [
    {
      provider: "hydracpf",
      url: process.env.HYDRACPF_API_URL,
      token: process.env.HYDRACPF_API_TOKEN,
      tokenHeader: process.env.HYDRACPF_API_HEADER || "Authorization"
    },
    {
      provider: "validaseguro",
      url: process.env.VALIDASEGURO_API_URL || (process.env.VALIDASEGURO_API_TOKEN ? "https://validaseguro.com.br/api/validar/cpf" : undefined),
      token: process.env.VALIDASEGURO_API_TOKEN,
      tokenHeader: process.env.VALIDASEGURO_API_HEADER || "X-API-Key"
    }
  ];

  for (const config of configs) {
    if (!config.url || !config.token) continue;
    const result = await validateWithProvider(config, cpf);
    providerResults.push(result);

    if (result.status === "invalid") {
      return {
        valid: false,
        cpf,
        provider: result.provider,
        providerResults,
        name: result.name,
        error: result.message || "CPF recusado pela validação externa."
      };
    }

    if (result.status === "valid") {
      return {
        valid: true,
        cpf,
        provider: result.provider,
        providerResults,
        name: result.name
      };
    }
  }

  return {
    valid: true,
    cpf,
    provider: "local",
    providerResults
  };
}

async function validateWithProvider(config: ProviderConfig, cpf: string): Promise<CpfProviderResult> {
  try {
    const endpoint = buildProviderUrl(config.url ?? "", cpf);
    const headers: Record<string, string> = { accept: "application/json" };
    headers[config.tokenHeader] = config.tokenHeader.toLowerCase() === "authorization" ? `Bearer ${config.token}` : String(config.token);

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return { provider: config.provider, status: "unavailable", message: `Provedor retornou HTTP ${response.status}.` };
    }

    const data = await response.json().catch(() => null);
    const parsed = parseProviderPayload(data);
    return {
      provider: config.provider,
      status: parsed.status,
      message: parsed.message,
      name: parsed.name
    };
  } catch (error) {
    return {
      provider: config.provider,
      status: "unavailable",
      message: error instanceof Error ? error.message : "Provedor indisponível."
    };
  }
}

function buildProviderUrl(baseUrl: string, cpf: string) {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  if (cleanBase.includes("{cpf}")) return cleanBase.replace("{cpf}", cpf);
  if (cleanBase.includes("?")) return `${cleanBase}&cpf=${cpf}`;
  return `${cleanBase}/${cpf}`;
}

function parseProviderPayload(data: unknown): { status: CpfProviderResult["status"]; message?: string; name?: string } {
  if (!data || typeof data !== "object") return { status: "unknown", message: "Resposta sem JSON válido." };
  const record = data as Record<string, unknown>;
  const explicit = firstDefined(record.valid, record.valido, record.isValid, record.success, record.sucesso, record.cpfValido);
  const statusText = normalize(firstDefined(record.status, record.situacao, record.message, record.mensagem));
  const name = String(firstDefined(record.name, record.nome, record.nomeCompleto, record.fullName) ?? "").trim() || undefined;

  if (explicit === true || explicit === "true" || explicit === 1 || explicit === "1") {
    return { status: "valid", message: "CPF validado por provedor externo.", name };
  }

  if (explicit === false || explicit === "false" || explicit === 0 || explicit === "0") {
    return { status: "invalid", message: "CPF inválido segundo o provedor externo.", name };
  }

  if (["valid", "valido", "válido", "regular", "ok", "ativo", "success", "sucesso"].some((word) => statusText.includes(word))) {
    return { status: "valid", message: "CPF validado por provedor externo.", name };
  }

  if (["invalid", "invalido", "inválido", "irregular", "cancelado", "suspenso", "error", "erro"].some((word) => statusText.includes(word))) {
    return { status: "invalid", message: "CPF recusado pelo provedor externo.", name };
  }

  return { status: "unknown", message: "Provedor consultado, mas a resposta não indicou validade com clareza.", name };
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
