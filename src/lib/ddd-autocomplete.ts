import { onlyDigits } from "@/lib/formatters";
import { db, throwDbError } from "@/lib/supabase-db";

export type DddLocation = {
  ddd: string;
  state: string;
  region: string;
  city: string;
};

type PartialLocation = {
  cep?: string | null;
  state?: string | null;
  city?: string | null;
  district?: string | null;
};

type UserLocationSource = PartialLocation & {
  phone?: string | null;
  whatsapp?: string | null;
};

type CepLocation = {
  cep: string;
  state: string;
  city: string;
  district: string | null;
  address: string | null;
  provider: string;
};

export const dddLocations: Record<string, DddLocation> = {
  "11": { ddd: "11", state: "SP", region: "Sudeste", city: "São Paulo" },
  "12": { ddd: "12", state: "SP", region: "Sudeste", city: "São José dos Campos" },
  "13": { ddd: "13", state: "SP", region: "Sudeste", city: "Santos" },
  "14": { ddd: "14", state: "SP", region: "Sudeste", city: "Bauru" },
  "15": { ddd: "15", state: "SP", region: "Sudeste", city: "Sorocaba" },
  "16": { ddd: "16", state: "SP", region: "Sudeste", city: "Ribeirão Preto" },
  "17": { ddd: "17", state: "SP", region: "Sudeste", city: "São José do Rio Preto" },
  "18": { ddd: "18", state: "SP", region: "Sudeste", city: "Presidente Prudente" },
  "19": { ddd: "19", state: "SP", region: "Sudeste", city: "Campinas" },
  "21": { ddd: "21", state: "RJ", region: "Sudeste", city: "Rio de Janeiro" },
  "22": { ddd: "22", state: "RJ", region: "Sudeste", city: "Campos dos Goytacazes" },
  "24": { ddd: "24", state: "RJ", region: "Sudeste", city: "Volta Redonda" },
  "27": { ddd: "27", state: "ES", region: "Sudeste", city: "Vitória" },
  "28": { ddd: "28", state: "ES", region: "Sudeste", city: "Cachoeiro de Itapemirim" },
  "31": { ddd: "31", state: "MG", region: "Sudeste", city: "Belo Horizonte" },
  "32": { ddd: "32", state: "MG", region: "Sudeste", city: "Juiz de Fora" },
  "33": { ddd: "33", state: "MG", region: "Sudeste", city: "Governador Valadares" },
  "34": { ddd: "34", state: "MG", region: "Sudeste", city: "Uberlândia" },
  "35": { ddd: "35", state: "MG", region: "Sudeste", city: "Poços de Caldas" },
  "37": { ddd: "37", state: "MG", region: "Sudeste", city: "Divinópolis" },
  "38": { ddd: "38", state: "MG", region: "Sudeste", city: "Montes Claros" },
  "41": { ddd: "41", state: "PR", region: "Sul", city: "Curitiba" },
  "42": { ddd: "42", state: "PR", region: "Sul", city: "Ponta Grossa" },
  "43": { ddd: "43", state: "PR", region: "Sul", city: "Londrina" },
  "44": { ddd: "44", state: "PR", region: "Sul", city: "Maringá" },
  "45": { ddd: "45", state: "PR", region: "Sul", city: "Foz do Iguaçu" },
  "46": { ddd: "46", state: "PR", region: "Sul", city: "Pato Branco" },
  "47": { ddd: "47", state: "SC", region: "Sul", city: "Joinville" },
  "48": { ddd: "48", state: "SC", region: "Sul", city: "Florianópolis" },
  "49": { ddd: "49", state: "SC", region: "Sul", city: "Chapecó" },
  "51": { ddd: "51", state: "RS", region: "Sul", city: "Porto Alegre" },
  "53": { ddd: "53", state: "RS", region: "Sul", city: "Pelotas" },
  "54": { ddd: "54", state: "RS", region: "Sul", city: "Caxias do Sul" },
  "55": { ddd: "55", state: "RS", region: "Sul", city: "Santa Maria" },
  "61": { ddd: "61", state: "DF", region: "Centro-Oeste", city: "Brasília" },
  "62": { ddd: "62", state: "GO", region: "Centro-Oeste", city: "Goiânia" },
  "64": { ddd: "64", state: "GO", region: "Centro-Oeste", city: "Rio Verde" },
  "65": { ddd: "65", state: "MT", region: "Centro-Oeste", city: "Cuiabá" },
  "66": { ddd: "66", state: "MT", region: "Centro-Oeste", city: "Rondonópolis" },
  "67": { ddd: "67", state: "MS", region: "Centro-Oeste", city: "Campo Grande" },
  "68": { ddd: "68", state: "AC", region: "Norte", city: "Rio Branco" },
  "69": { ddd: "69", state: "RO", region: "Norte", city: "Porto Velho" },
  "71": { ddd: "71", state: "BA", region: "Nordeste", city: "Salvador" },
  "73": { ddd: "73", state: "BA", region: "Nordeste", city: "Ilhéus" },
  "74": { ddd: "74", state: "BA", region: "Nordeste", city: "Juazeiro" },
  "75": { ddd: "75", state: "BA", region: "Nordeste", city: "Feira de Santana" },
  "77": { ddd: "77", state: "BA", region: "Nordeste", city: "Vitória da Conquista" },
  "79": { ddd: "79", state: "SE", region: "Nordeste", city: "Aracaju" },
  "81": { ddd: "81", state: "PE", region: "Nordeste", city: "Recife" },
  "87": { ddd: "87", state: "PE", region: "Nordeste", city: "Petrolina" },
  "82": { ddd: "82", state: "AL", region: "Nordeste", city: "Maceió" },
  "83": { ddd: "83", state: "PB", region: "Nordeste", city: "João Pessoa" },
  "84": { ddd: "84", state: "RN", region: "Nordeste", city: "Natal" },
  "85": { ddd: "85", state: "CE", region: "Nordeste", city: "Fortaleza" },
  "88": { ddd: "88", state: "CE", region: "Nordeste", city: "Juazeiro do Norte" },
  "86": { ddd: "86", state: "PI", region: "Nordeste", city: "Teresina" },
  "89": { ddd: "89", state: "PI", region: "Nordeste", city: "Picos" },
  "91": { ddd: "91", state: "PA", region: "Norte", city: "Belém" },
  "93": { ddd: "93", state: "PA", region: "Norte", city: "Santarém" },
  "94": { ddd: "94", state: "PA", region: "Norte", city: "Marabá" },
  "92": { ddd: "92", state: "AM", region: "Norte", city: "Manaus" },
  "97": { ddd: "97", state: "AM", region: "Norte", city: "Tefé" },
  "95": { ddd: "95", state: "RR", region: "Norte", city: "Boa Vista" },
  "96": { ddd: "96", state: "AP", region: "Norte", city: "Macapá" },
  "98": { ddd: "98", state: "MA", region: "Nordeste", city: "São Luís" },
  "99": { ddd: "99", state: "MA", region: "Nordeste", city: "Imperatriz" },
  "63": { ddd: "63", state: "TO", region: "Norte", city: "Palmas" }
};

export function getDddFromPhone(value: string | null | undefined) {
  let digits = onlyDigits(value);
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length < 10) return null;
  const ddd = digits.slice(0, 2);
  return dddLocations[ddd] ? ddd : null;
}

export async function findDddLocation(value: string | null | undefined): Promise<DddLocation | null> {
  const ddd = getDddFromPhone(value);
  if (!ddd) return null;
  const fallback = dddLocations[ddd] ?? null;

  const cityByDdd = await findCityByDddFromBrazilTable(ddd).catch(() => null);
  if (cityByDdd) return cityByDdd;

  try {
    const { data: row, error } = await db()
      .from("ddds")
      .select("ddd,estado,regiao")
      .eq("ddd", ddd)
      .maybeSingle();
    throwDbError(error);
    if (!row) return fallback;
    return {
      ddd: row.ddd,
      state: row.estado,
      region: row.regiao,
      city: fallback?.city ?? ""
    };
  } catch {
    return fallback;
  }
}

export async function findCepLocation(value: string | null | undefined): Promise<CepLocation | null> {
  const cep = onlyDigits(value);
  if (cep.length !== 8) return null;
  const providers = [lookupBrasilApiCep, lookupViaCep, lookupOpenCep];
  for (const provider of providers) {
    const result = await provider(cep).catch(() => null);
    if (result?.state && result.city) return result;
  }
  return null;
}

export async function completeLocationFromCepThenDdd(input: PartialLocation, user: UserLocationSource) {
  let state = cleanState(input.state) || cleanState(user.state);
  let city = cleanText(input.city) || cleanText(user.city);
  let district = cleanText(input.district) || cleanText(user.district) || null;

  if (!state || !city || !district) {
    const cepLocation = await findCepLocation(input.cep || user.cep);
    if (cepLocation) {
      state ||= cepLocation.state;
      city ||= cepLocation.city;
      district ||= cepLocation.district;
    }
  }

  if (!state || !city) {
    const dddLocation = await findDddLocation(user.whatsapp || user.phone);
    if (dddLocation) {
      state ||= dddLocation.state;
      city ||= dddLocation.city;
    }
  }

  return { state, city, district };
}

export const completeLocationFromUserAndDdd = completeLocationFromCepThenDdd;

async function findCityByDddFromBrazilTable(ddd: string): Promise<DddLocation | null> {
  try {
    const { data, error } = await db()
      .from("cidades_brasil")
      .select("cidade,uf,ddd")
      .eq("ddd", ddd)
      .order("cidade", { ascending: true })
      .limit(1);
    throwDbError(error);
    const row = data?.[0];
    if (!row?.uf || !row?.cidade) return null;
    return { ddd, state: row.uf, region: dddLocations[ddd]?.region ?? "", city: row.cidade };
  } catch {
    return null;
  }
}

async function lookupBrasilApiCep(cep: string): Promise<CepLocation | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { cache: "no-store", signal: AbortSignal.timeout(1800) });
  if (!response.ok) return null;
  const data = await response.json();
  return normalizeCepResult({ cep, state: data.state, city: data.city, district: data.neighborhood, address: data.street, provider: "brasilapi" });
}

async function lookupViaCep(cep: string): Promise<CepLocation | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store", signal: AbortSignal.timeout(1800) });
  if (!response.ok) return null;
  const data = await response.json();
  if (data.erro) return null;
  return normalizeCepResult({ cep, state: data.uf, city: data.localidade, district: data.bairro, address: data.logradouro, provider: "viacep" });
}

async function lookupOpenCep(cep: string): Promise<CepLocation | null> {
  const response = await fetch(`https://opencep.com/v1/${cep}`, { cache: "no-store", signal: AbortSignal.timeout(1800) });
  if (!response.ok) return null;
  const data = await response.json();
  return normalizeCepResult({ cep, state: data.uf, city: data.localidade, district: data.bairro, address: data.logradouro, provider: "opencep" });
}

function normalizeCepResult(input: CepLocation): CepLocation | null {
  const state = cleanState(input.state);
  const city = cleanText(input.city);
  if (!state || !city) return null;
  return {
    cep: input.cep,
    state,
    city,
    district: cleanText(input.district) || null,
    address: cleanText(input.address) || null,
    provider: input.provider
  };
}

function cleanState(value: string | null | undefined) {
  const state = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(state) ? state : "";
}

function cleanText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "";
}


