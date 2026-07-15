import { onlyDigits } from "@/lib/formatters";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export type WantedRequest = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  durationDays: number;
  expiresAt: string;
  contactClickCount: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    name: string;
    whatsapp: string;
    city: string | null;
    state: string | null;
  };
};

type WantedRequestRow = Omit<WantedRequest, "owner">;

type WantedRequestOwner = {
  id: string;
  name: string;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
};

export const wantedRequestDurations = [7, 15, 30] as const;
export type WantedRequestContext = "VEHICLE" | "REAL_ESTATE" | "SERVICE";

export async function createWantedRequest(input: { ownerId: string; title: string; description: string; durationDays: number }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationDays * 86400000);
  const { data, error } = await db()
    .from("WantedRequest")
    .insert({
      id: newDbId(),
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      durationDays: input.durationDays,
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString()
    })
    .select("id")
    .single();
  throwDbError(error);
  return data as { id: string };
}

export async function findActiveWantedRequests(limit = 6) {
  const { data, error } = await db()
    .from("WantedRequest")
    .select("id,ownerId,title,description,durationDays,expiresAt,contactClickCount,createdAt,updatedAt")
    .gt("expiresAt", new Date().toISOString())
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (isMissingWantedRequestRelation(error)) return [];
  throwDbError(error);
  return hydrateWantedRequests((data ?? []) as WantedRequestRow[]);
}

export async function findActiveWantedRequestsByContext(input: { q?: string; context?: WantedRequestContext; limit?: number }) {
  const fetchLimit = Math.max((input.limit ?? 6) * 4, 24);
  const requests = await findActiveWantedRequests(fetchLimit);
  const query = normalizeWantedText(input.q);
  return requests
    .filter((request) => !input.context || classifyWantedRequest(request) === input.context)
    .filter((request) => !query || wantedRequestMatchesQuery(request, query))
    .slice(0, input.limit ?? 6);
}

export async function findUserWantedRequests(ownerId: string) {
  const { data, error } = await db()
    .from("WantedRequest")
    .select("id,ownerId,title,description,durationDays,expiresAt,contactClickCount,createdAt,updatedAt")
    .eq("ownerId", ownerId)
    .order("createdAt", { ascending: false });
  if (isMissingWantedRequestRelation(error)) return [];
  throwDbError(error);
  return hydrateWantedRequests((data ?? []) as WantedRequestRow[]);
}

export async function deleteWantedRequest(id: string, ownerId: string) {
  const { error } = await db()
    .from("WantedRequest")
    .delete()
    .eq("id", id)
    .eq("ownerId", ownerId);
  throwDbError(error);
}

export async function updateWantedRequest(input: { id: string; ownerId: string; title: string; description: string }) {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("WantedRequest")
    .update({
      title: input.title,
      description: input.description,
      updatedAt: now
    })
    .eq("id", input.id)
    .eq("ownerId", input.ownerId)
    .select("id,title,description,updatedAt")
    .maybeSingle();
  throwDbError(error);
  return data as { id: string; title: string; description: string; updatedAt: string } | null;
}

export async function findWantedRequestContact(id: string) {
  const { data, error } = await db()
    .from("WantedRequest")
    .select("id,ownerId,title,expiresAt")
    .eq("id", id)
    .gt("expiresAt", new Date().toISOString())
    .maybeSingle();
  if (isMissingWantedRequestRelation(error)) return null;
  throwDbError(error);
  if (!data) return null;

  const { data: owner, error: ownerError } = await db()
    .from("User")
    .select("id,name,whatsapp")
    .eq("id", data.ownerId)
    .maybeSingle();
  throwDbError(ownerError);
  if (!owner?.whatsapp) return null;

  return {
    id: data.id,
    title: data.title,
    whatsappUrl: wantedRequestWhatsappUrl(owner.whatsapp, data.title)
  };
}

export async function recordWantedRequestContactClick(id: string) {
  const { error } = await db().rpc("increment_wanted_request_contact_click", { _id: id });
  if (isMissingWantedRequestFunction(error)) return;
  throwDbError(error);
}

export async function deleteExpiredWantedRequests() {
  const { data, error } = await db().rpc("delete_expired_wanted_requests");
  if (isMissingWantedRequestFunction(error)) return 0;
  throwDbError(error);
  return Number(data ?? 0);
}

export function wantedRequestWhatsappUrl(whatsapp: string, title: string) {
  const phone = normalizeBrazilPhone(whatsapp);
  const message = `Vi no Achei X que você procura um(a) *${title}*, podemos conversar?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function normalizeBrazilPhone(value: string) {
  const digits = onlyDigits(value);
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export function classifyWantedRequest(request: Pick<WantedRequest, "title" | "description">): WantedRequestContext {
  const text = normalizeWantedText(`${request.title} ${request.description}`);
  if (vehicleWantedTerms.some((term) => text.includes(term))) return "VEHICLE";
  if (realEstateWantedTerms.some((term) => text.includes(term))) return "REAL_ESTATE";
  return "SERVICE";
}

function wantedRequestMatchesQuery(request: Pick<WantedRequest, "title" | "description">, query: string) {
  const text = normalizeWantedText(`${request.title} ${request.description}`);
  const terms = query.split(" ").filter((term) => term.length >= 2);
  if (!terms.length) return true;
  return terms.some((term) => text.includes(term));
}

function normalizeWantedText(value?: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const vehicleWantedTerms = [
  "carro",
  "veiculo",
  "auto",
  "automovel",
  "moto",
  "motocicleta",
  "bike",
  "bicicleta",
  "caminhao",
  "camionete",
  "caminhonete",
  "van",
  "onibus",
  "utilitario",
  "embarcacao",
  "honda",
  "toyota",
  "ford",
  "chevrolet",
  "fiat",
  "volkswagen",
  "hyundai",
  "renault",
  "jeep"
];

const realEstateWantedTerms = [
  "casa",
  "apartamento",
  "apto",
  "imovel",
  "terreno",
  "sitio",
  "chacara",
  "fazenda",
  "sala comercial",
  "galpao",
  "loja",
  "aluguel",
  "alugar",
  "locacao",
  "comprar",
  "condominio",
  "sobrado",
  "kitnet"
];

async function hydrateWantedRequests(rows: WantedRequestRow[]) {
  const ownerIds = [...new Set(rows.map((row) => row.ownerId).filter(Boolean))];
  const { data: owners, error } = ownerIds.length
    ? await db().from("User").select("id,name,whatsapp,city,state").in("id", ownerIds)
    : { data: [], error: null };
  throwDbError(error);

  const ownerById = new Map((owners ?? []).map((owner: WantedRequestOwner) => [owner.id, owner]));
  return rows
    .map((row) => {
      const owner = ownerById.get(row.ownerId);
      if (!owner?.whatsapp) return null;
      return {
        ...row,
        owner: {
          name: owner.name,
          whatsapp: owner.whatsapp,
          city: owner.city,
          state: owner.state
        }
      };
    })
    .filter((row): row is WantedRequest => Boolean(row));
}

function isMissingWantedRequestRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "").toLowerCase() : "";
  return code === "42P01" || code === "PGRST205" || message.includes("wantedrequest");
}

function isMissingWantedRequestFunction(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "").toLowerCase() : "";
  return code === "42883" || code === "PGRST202" || message.includes("wanted_request");
}
