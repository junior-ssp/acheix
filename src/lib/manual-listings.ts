import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/formatters";

export const manualListingOwnerEmail = "junior.representacoes.br@gmail.com";

export type ManualListingCategory = "VEHICLE" | "REAL_ESTATE" | "COMPANY" | "SERVICE" | "PRODUCT";

export type ManualListing = {
  id: string;
  ownerId: string;
  title: string;
  address: string;
  priceCents: number | null;
  phone: string;
  tollFree: string;
  whatsapp: string;
  whatsapp2: string;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
  vidiu: string | null;
  category: ManualListingCategory;
  durationDays: number;
  expiresAt: string;
  contactClickCount: number;
  lastTopRefreshAt: string | null;
  nextTopRefreshAt: string;
  createdAt: string;
  updatedAt: string;
  photos: Array<{ id: string; url: string; alt: string | null; order: number }>;
};

type ManualListingRow = Omit<ManualListing, "photos">;

export const manualListingDurations = [7, 15, 30, 90, 180, 365] as const;
export const manualListingCategories: Array<{ value: ManualListingCategory; label: string }> = [
  { value: "VEHICLE", label: "Veículos" },
  { value: "REAL_ESTATE", label: "Imóveis" },
  { value: "PRODUCT", label: "Produtos" },
  { value: "COMPANY", label: "Empresas" },
  { value: "SERVICE", label: "Serviços" }
];

const manualListingBaseColumns = [
  "id",
  "ownerId",
  "title",
  "address",
  "phone",
  "website",
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "category",
  "durationDays",
  "expiresAt",
  "contactClickCount",
  "lastTopRefreshAt",
  "nextTopRefreshAt",
  "createdAt",
  "updatedAt"
];
const manualListingOptionalColumns = ["whatsapp", "whatsapp2", "priceCents", "tollFree", "vidiu"] as const;
type ManualListingOptionalColumn = typeof manualListingOptionalColumns[number];
type ManualListingColumnSupport = Record<ManualListingOptionalColumn, boolean>;
let manualListingColumnSupport: ManualListingColumnSupport | null = null;

async function getManualListingColumns() {
  if (manualListingColumnSupport) {
    return manualListingColumnsForSupport(manualListingColumnSupport);
  }

  const support: ManualListingColumnSupport = { whatsapp: false, whatsapp2: false, priceCents: false, tollFree: false, vidiu: false };
  for (const column of manualListingOptionalColumns) {
    const { error } = await db().from("ManualListing").select(column).limit(1);
    if (!error) {
      support[column] = true;
      continue;
    }
    if (!isMissingManualListingColumn(error, column)) throwDbError(error);
  }
  manualListingColumnSupport = support;
  return manualListingColumnsForSupport(support);
}

function isMissingManualListingColumn(error: unknown, columnName = "whatsapp") {
  const code = error && typeof error === "object" && "code" in error ? String((error as any).code) : "";
  const message = error && typeof error === "object" && "message" in error ? String((error as any).message).toLowerCase() : "";
  return code === "42703" && message.includes(columnName.toLowerCase()) || (message.includes("column") && message.includes(columnName.toLowerCase()) && message.includes("does not exist"));
}

async function hasManualListingWhatsappSupport() {
  return (await getManualListingColumnSupport()).whatsapp;
}

async function hasManualListingWhatsapp2Support() {
  return (await getManualListingColumnSupport()).whatsapp2;
}

async function hasManualListingPriceSupport() {
  return (await getManualListingColumnSupport()).priceCents;
}

async function hasManualListingTollFreeSupport() {
  return (await getManualListingColumnSupport()).tollFree;
}

async function hasManualListingVidiuSupport() {
  return (await getManualListingColumnSupport()).vidiu;
}

async function getManualListingColumnSupport() {
  await getManualListingColumns();
  return manualListingColumnSupport ?? { whatsapp: false, whatsapp2: false, priceCents: false, tollFree: false, vidiu: false };
}

function manualListingColumnsForSupport(support: ManualListingColumnSupport) {
  return [
    ...manualListingBaseColumns.slice(0, 5),
    ...(support.tollFree ? ["tollFree"] : []),
    ...(support.whatsapp ? ["whatsapp"] : []),
    ...(support.whatsapp2 ? ["whatsapp2"] : []),
    ...(support.priceCents ? ["priceCents"] : []),
    ...(support.vidiu ? ["vidiu"] : []),
    ...manualListingBaseColumns.slice(5)
  ].join(",");
}

export function canManageManualListings(user: Pick<SessionUser, "email"> | null | undefined) {
  return user?.email?.toLowerCase() === manualListingOwnerEmail;
}

export function requireManualListingManager(user: Pick<SessionUser, "email">) {
  if (!canManageManualListings(user)) throw new Response("Forbidden", { status: 403 });
}

export async function createManualListing(input: {
  ownerId: string;
  title: string;
  address: string;
  priceCents?: number | null;
  phone: string;
  tollFree?: string | null;
  whatsapp?: string | null;
  whatsapp2?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  vidiu?: string | null;
  category: ManualListingCategory;
  durationDays: number;
  photos: string[];
}) {
  const now = new Date();
  const id = newDbId();
  const expiresAt = new Date(now.getTime() + input.durationDays * 86400000);
  const normalized = normalizeManualListingRequiredText(input);
  const priceCents = normalizeManualListingPrice(input.priceCents);
  const values: Record<string, unknown> = {
    id,
    ownerId: input.ownerId,
    title: normalized.title,
    address: normalized.address,
    phone: normalized.phone,
    website: cleanOptionalUrl(input.website),
    facebook: cleanOptionalUrl(input.facebook),
    instagram: cleanOptionalUrl(input.instagram),
    youtube: cleanOptionalUrl(input.youtube),
    tiktok: cleanOptionalUrl(input.tiktok),
    category: input.category,
    durationDays: input.durationDays,
    expiresAt: expiresAt.toISOString(),
    lastTopRefreshAt: now.toISOString(),
    nextTopRefreshAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    updatedAt: now.toISOString()
  };
  if (await hasManualListingTollFreeSupport()) values.tollFree = normalizeManualListingOptionalText(input.tollFree);
  if (await hasManualListingWhatsappSupport()) values.whatsapp = normalizeManualListingOptionalText(input.whatsapp);
  if (await hasManualListingWhatsapp2Support()) values.whatsapp2 = normalizeManualListingOptionalText(input.whatsapp2);
  if (await hasManualListingPriceSupport()) values.priceCents = priceCents;
  if (await hasManualListingVidiuSupport()) values.vidiu = cleanOptionalUrl(input.vidiu);
  const { data, error } = await db()
    .from("ManualListing")
    .insert(values)
    .select("id")
    .single();
  throwDbError(error);
  await replaceManualListingPhotos(id, input.photos, normalized.title);
  return data as { id: string };
}

export async function updateManualListing(input: {
  id: string;
  ownerId: string;
  title: string;
  address: string;
  priceCents?: number | null;
  phone: string;
  tollFree?: string | null;
  whatsapp?: string | null;
  whatsapp2?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  vidiu?: string | null;
  category: ManualListingCategory;
  durationDays: number;
  photos: string[];
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationDays * 86400000);
  const normalized = normalizeManualListingRequiredText(input);
  const priceCents = normalizeManualListingPrice(input.priceCents);
  const existingContact = await findManualListingContact(input.id, input.ownerId);
  const values: Record<string, unknown> = {
    title: normalized.title,
    address: normalized.address,
    phone: normalized.phone,
    website: cleanOptionalUrl(input.website),
    facebook: cleanOptionalUrl(input.facebook),
    instagram: cleanOptionalUrl(input.instagram),
    youtube: cleanOptionalUrl(input.youtube),
    tiktok: cleanOptionalUrl(input.tiktok),
    category: input.category,
    durationDays: input.durationDays,
    expiresAt: expiresAt.toISOString(),
    updatedAt: now.toISOString()
  };
  if (await hasManualListingTollFreeSupport()) values.tollFree = preserveExistingWhenBlank(input.tollFree, existingContact?.tollFree);
  if (await hasManualListingWhatsappSupport()) values.whatsapp = preserveExistingWhenBlank(input.whatsapp, existingContact?.whatsapp);
  if (await hasManualListingWhatsapp2Support()) values.whatsapp2 = preserveExistingWhenBlank(input.whatsapp2, existingContact?.whatsapp2);
  if (await hasManualListingPriceSupport()) values.priceCents = priceCents;
  if (await hasManualListingVidiuSupport()) values.vidiu = cleanOptionalUrl(input.vidiu);
  const { data, error } = await db()
    .from("ManualListing")
    .update(values)
    .eq("id", input.id)
    .eq("ownerId", input.ownerId)
    .select("id")
    .maybeSingle();
  throwDbError(error);
  if (!data) return null;
  await replaceManualListingPhotos(input.id, input.photos, normalized.title);
  return data as { id: string };
}

export async function deleteManualListing(id: string, ownerId: string) {
  const { error } = await db()
    .from("ManualListing")
    .delete()
    .eq("id", id)
    .eq("ownerId", ownerId);
  throwDbError(error);
}

export async function findUserManualListings(ownerId: string) {
  const { data, error } = await db()
    .from("ManualListing")
    .select(await getManualListingColumns())
    .eq("ownerId", ownerId)
    .order("createdAt", { ascending: false });
  if (isMissingManualListingRelation(error)) return [];
  throwDbError(error);
  return hydrateManualListings((data ?? []) as unknown as ManualListingRow[]);
}

export async function findManagerManualListings(user: Pick<SessionUser, "id" | "email">) {
  const items = await findUserManualListings(user.id);
  if (items.length || !canManageManualListings(user)) return items;

  const { data, error } = await db().from("User").select("id").eq("email", manualListingOwnerEmail).maybeSingle();
  throwDbError(error);
  if (!data?.id || data.id === user.id) return items;
  return findUserManualListings(data.id);
}

export async function findActiveManualListings(input: { categories?: ManualListingCategory[]; limit?: number; preferViewerLocation?: boolean; preferredState?: string; preferredCity?: string } = {}) {
  await refreshManualListingTopPositions();
  const requestedLimit = input.limit ?? 12;
  let query = db()
    .from("ManualListing")
    .select(await getManualListingColumns())
    .gt("expiresAt", new Date().toISOString())
    .order("lastTopRefreshAt", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(input.preferViewerLocation ? Math.max(requestedLimit * 5, 60) : requestedLimit);
  if (input.categories?.length) query = query.in("category", input.categories);
  const { data, error } = await query;
  if (isMissingManualListingRelation(error)) return [];
  throwDbError(error);
  const listings = await hydrateManualListings((data ?? []) as unknown as ManualListingRow[]);
  if (!input.preferViewerLocation) return listings;
  const user = input.preferredState || input.preferredCity ? null : await getCurrentUser().catch(() => null);
  return prioritizeManualListingsByLocation(
    listings,
    input.preferredState ?? user?.state,
    input.preferredCity ?? user?.city
  ).slice(0, requestedLimit);
}

function prioritizeManualListingsByLocation(listings: ManualListing[], state?: string | null, city?: string | null) {
  const preferredState = normalizeLocationToken(state);
  const preferredCity = normalizeLocationToken(city);
  if (!preferredState && !preferredCity) return listings;
  return listings
    .map((listing, index) => ({ listing, index, score: manualListingLocationScore(listing, preferredState, preferredCity) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ listing }) => listing);
}

function manualListingLocationScore(listing: ManualListing, preferredState: string, preferredCity: string) {
  const address = normalizeLocationToken(listing.address);
  let score = 0;
  if (preferredState && (address.includes(`/${preferredState}`) || address.includes(` ${preferredState} `))) score += 1;
  if (preferredCity && address.includes(preferredCity)) score += 2;
  return score;
}

function normalizeLocationToken(value?: string | null) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function findPublicManualListing(id: string) {
  const { data, error } = await db()
    .from("ManualListing")
    .select(await getManualListingColumns())
    .eq("id", id)
    .gt("expiresAt", new Date().toISOString())
    .maybeSingle();
  if (isMissingManualListingRelation(error)) return null;
  throwDbError(error);
  if (!data) return null;
  const [listing] = await hydrateManualListings([data as unknown as ManualListingRow]);
  return listing ?? null;
}

export async function deleteExpiredManualListings() {
  const { data, error } = await db().rpc("delete_expired_manual_listings");
  if (isMissingManualListingFunction(error)) return 0;
  throwDbError(error);
  return Number(data ?? 0);
}

export async function refreshManualListingTopPositions() {
  const { error } = await db().rpc("refresh_manual_listing_top_positions");
  if (isMissingManualListingFunction(error)) return;
  throwDbError(error);
}

export function manualListingWhatsappUrl(whatsapp: string, phone: string, title: string) {
  const digits = onlyDigits(whatsapp) || onlyDigits(phone);
  if (digits.length < 10) return "";
  const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const message = `Vi no Achei X o anúncio "${displayManualListingTitle(title)}" e gostaria de conversar.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function manualListingPhoneUrl(phone: string | null | undefined) {
  const digits = onlyDigits(phone);
  if (digits.length < 8) return "";
  return `tel:${digits}`;
}

export function displayManualListingTitle(title: string | null | undefined) {
  const text = String(title ?? "").trim();
  return text && text !== manualListingEmptyTitle ? text : "Anúncio Avulso";
}

export function displayManualListingAddress(address: string | null | undefined) {
  const text = String(address ?? "").trim();
  return text && text !== manualListingEmptyAddress ? text : "";
}

export function editableManualListingTitle(title: string | null | undefined) {
  const text = String(title ?? "").trim();
  return text === manualListingEmptyTitle ? "" : text;
}

export function editableManualListingAddress(address: string | null | undefined) {
  const text = String(address ?? "").trim();
  return text === manualListingEmptyAddress ? "" : text;
}

export function editableManualListingPhone(phone: string | null | undefined) {
  const text = String(phone ?? "").trim();
  return text === manualListingEmptyPhone ? "" : text;
}

export function editableManualListingWhatsapp(whatsapp: string | null | undefined) {
  const text = String(whatsapp ?? "").trim();
  return text === manualListingEmptyWhatsapp ? "" : text;
}

async function hydrateManualListings(rows: ManualListingRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const { data, error } = await db()
    .from("ManualListingPhoto")
    .select("id,manualListingId,url,alt,order")
    .in("manualListingId", ids)
    .order("order", { ascending: true });
  throwDbError(error);
  const photosByListing = new Map<string, Array<{ id: string; url: string; alt: string | null; order: number }>>();
  for (const photo of (data ?? []) as Array<{ id: string; manualListingId: string; url: string; alt: string | null; order: number }>) {
    const current = photosByListing.get(photo.manualListingId) ?? [];
    current.push({ id: photo.id, url: photo.url, alt: photo.alt, order: photo.order });
    photosByListing.set(photo.manualListingId, current);
  }
  return rows.map((row) => ({
    ...row,
    priceCents: row.priceCents ?? null,
    tollFree: row.tollFree ?? "",
    whatsapp: row.whatsapp ?? "",
    whatsapp2: row.whatsapp2 ?? "",
    vidiu: row.vidiu ?? null,
    photos: photosByListing.get(row.id) ?? []
  })) as ManualListing[];
}

async function replaceManualListingPhotos(manualListingId: string, photos: string[], title: string) {
  const { error: deleteError } = await db().from("ManualListingPhoto").delete().eq("manualListingId", manualListingId);
  throwDbError(deleteError);
  const rows = photos.slice(0, 5).map((url, index) => ({
    id: newDbId(),
    manualListingId,
    url,
    alt: title,
    order: index
  }));
  if (!rows.length) return;
  const { error } = await db().from("ManualListingPhoto").insert(rows);
  throwDbError(error);
}

async function findManualListingContact(id: string, ownerId: string) {
  const support = await getManualListingColumnSupport();
  const columns = [
    "id",
    ...(support.tollFree ? ["tollFree"] : []),
    ...(support.whatsapp ? ["whatsapp"] : []),
    ...(support.whatsapp2 ? ["whatsapp2"] : [])
  ].join(",");
  const { data, error } = await db()
    .from("ManualListing")
    .select(columns)
    .eq("id", id)
    .eq("ownerId", ownerId)
    .maybeSingle();
  throwDbError(error);
  return data as { tollFree?: string | null; whatsapp?: string | null; whatsapp2?: string | null } | null;
}

function isMissingManualListingRelation(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as any).code) : "";
  const message = error && typeof error === "object" && "message" in error ? String((error as any).message).toLowerCase() : "";
  return code === "42P01" || code === "PGRST205" || message.includes("manuallisting");
}

function isMissingManualListingFunction(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as any).code) : "";
  const message = error && typeof error === "object" && "message" in error ? String((error as any).message).toLowerCase() : "";
  return code === "42883" || code === "PGRST202" || message.includes("manual_listing");
}

function cleanOptionalUrl(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

const manualListingEmptyTitle = "Anúncio Avulso";
const manualListingEmptyAddress = "Endereço não informado";
const manualListingEmptyPhone = "Não informado";
const manualListingEmptyWhatsapp = "Não informado";

function normalizeManualListingRequiredText(input: { title: string; address: string; phone: string }) {
  return {
    title: input.title.trim() || manualListingEmptyTitle,
    address: input.address.trim() || manualListingEmptyAddress,
    phone: input.phone.trim() || manualListingEmptyPhone
  };
}

function normalizeManualListingOptionalText(value?: string | null) {
  return String(value ?? "").trim();
}

function preserveExistingWhenBlank(nextValue?: string | null, existingValue?: string | null) {
  const next = normalizeManualListingOptionalText(nextValue);
  if (next) return next;
  return normalizeManualListingOptionalText(existingValue);
}

function normalizeManualListingPrice(value?: number | null) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

