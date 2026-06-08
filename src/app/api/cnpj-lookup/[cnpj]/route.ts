import { onlyDigits } from "@/lib/formatters";
import { json } from "@/lib/http";
import { isValidCnpj } from "@/lib/validators";

export const dynamic = "force-dynamic";

type LookupResult = {
  provider: string;
  companyName: string;
  tradeName: string;
  cep: string;
  state: string;
  city: string;
  district: string;
  address: string;
  number: string;
};

export async function GET(_request: Request, { params }: { params: { cnpj: string } }) {
  const cnpj = onlyDigits(params.cnpj);
  if (!isValidCnpj(cnpj)) return json({ error: "Informe um CNPJ válido no formato XX.XXX.XXX/XXXX-XX." }, 422);

  const brasilApi = await lookupBrasilApi(cnpj).catch(() => null);
  if (brasilApi) return json(brasilApi);

  const receitaWs = await lookupReceitaWs(cnpj).catch(() => null);
  if (receitaWs) return json(receitaWs);

  return json({ error: "Não foi possível consultar este CNPJ agora. Confira o número e tente novamente." }, 404);
}

async function lookupBrasilApi(cnpj: string): Promise<LookupResult | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  const companyName = String(data.razao_social ?? "").trim();
  const tradeName = String(data.nome_fantasia ?? "").trim();
  if (!companyName && !tradeName) return null;

  return {
    provider: "brasilapi",
    companyName,
    tradeName,
    cep: onlyDigits(data.cep),
    state: String(data.uf ?? "").trim().toUpperCase(),
    city: String(data.municipio ?? "").trim(),
    district: String(data.bairro ?? "").trim(),
    address: String(data.logradouro ?? "").trim(),
    number: String(data.numero ?? "").trim()
  };
}

async function lookupReceitaWs(cnpj: string): Promise<LookupResult | null> {
  const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  if (data?.status === "ERROR") return null;

  const companyName = String(data.nome ?? "").trim();
  const tradeName = String(data.fantasia ?? "").trim();
  if (!companyName && !tradeName) return null;

  return {
    provider: "receitaws",
    companyName,
    tradeName,
    cep: onlyDigits(data.cep),
    state: String(data.uf ?? "").trim().toUpperCase(),
    city: String(data.municipio ?? "").trim(),
    district: String(data.bairro ?? "").trim(),
    address: String(data.logradouro ?? "").trim(),
    number: String(data.numero ?? "").trim()
  };
}
