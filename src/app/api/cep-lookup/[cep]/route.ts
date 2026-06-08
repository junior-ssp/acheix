import { onlyDigits } from "@/lib/formatters";
import { json } from "@/lib/http";
import { db, newDbId } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

type CepResult = {
  cep: string;
  address?: string;
  district?: string;
  city?: string;
  state?: string;
  provider: string;
};

export async function GET(_: Request, { params }: { params: { cep: string } }) {
  const cep = onlyDigits(params.cep);
  if (cep.length !== 8) return json({ error: "CEP invalido. Use XXXXX-XXX." }, 422);

  const providers = [lookupBrasilApi, lookupViaCep, lookupOpenCep];
  for (const provider of providers) {
    const result = await provider(cep).catch(() => null);
    if (result?.city && result.state) {
      await logCepLookup(result);
      return json(result);
    }
  }

  return json({ error: "CEP não encontrado nas APIs gratuitas." }, 404);
}

async function lookupBrasilApi(cep: string): Promise<CepResult | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    cep,
    address: data.street,
    district: data.neighborhood,
    city: data.city,
    state: data.state,
    provider: "brasilapi"
  };
}

async function lookupViaCep(cep: string): Promise<CepResult | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  if (data.erro) return null;
  return {
    cep,
    address: data.logradouro,
    district: data.bairro,
    city: data.localidade,
    state: data.uf,
    provider: "viacep"
  };
}

async function lookupOpenCep(cep: string): Promise<CepResult | null> {
  const response = await fetch(`https://opencep.com/v1/${cep}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    cep,
    address: data.logradouro,
    district: data.bairro,
    city: data.localidade,
    state: data.uf,
    provider: "opencep"
  };
}


async function logCepLookup(result: CepResult) {
  try {
    await db().from("AuditLog").insert({ id: newDbId(), action: "cep.lookup", metadata: result });
  } catch {
    // Auditoria de CEP não pode impedir o preenchimento do endereço.
  }
}


