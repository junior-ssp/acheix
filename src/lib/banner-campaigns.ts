import { addDays } from "@/lib/expiration-policy";
import { createNotification } from "@/lib/notifications";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export type BannerPlanType = "TOP_15" | "TOP_30";
export type BannerPlacement = "CAROUSEL" | "DESKTOP_HERO";

export type BannerCampaignInput = {
  campaignId: string;
  userId: string;
  planType: BannerPlanType;
  bannerQuantity: number;
  periods: number;
  campaignTitle: string;
  destinationUrl: string;
  mediaUrl: string;
  bannerImagePositionY: number;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  rainbowBorderEnabled: boolean;
  displayOrder: number;
  placement: BannerPlacement;
  mediaType: "IMAGE";
  amountCents: number;
};

export type BannerCampaignRecord = BannerCampaignInput & {
  status: "DRAFT" | "PENDING_PAYMENT" | "ACTIVE" | "REMOVED";
  startsAt: string | null;
  endsAt: string | null;
  paymentId: string | null;
  updatedAt: string;
};

export const bannerPlans = {
  TOP_15: { name: "TOP 15", days: 15, unitAmountCents: 9900, maxPeriods: 6 },
  TOP_30: { name: "TOP 30", days: 30, unitAmountCents: 14900, maxPeriods: 3 }
} as const;

const defaultRainbowBorderCampaignIds = new Set(["5fbc45bc-3fce-4ed0-852b-34bb59b0cfac"]);

export function parseBannerProviderRef(providerRef: string | null | undefined) {
  const [kind, campaignId, planType] = String(providerRef ?? "").split(":");
  if (kind !== "banner" || !campaignId || !isBannerPlanType(planType)) return null;
  return { campaignId, planType };
}

export async function createBannerCampaignPayment(input: Omit<BannerCampaignInput, "campaignId">) {
  const now = new Date();
  const campaignId = newDbId();
  const paymentId = newDbId();
  const frame = normalizeBannerFrame(input);

  const { error: auditError } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: input.userId,
    action: "banner.campaign.created",
    metadata: {
      ...input,
      campaignId,
      ...frame,
      bannerImagePositionY: frame.imagePositionY,
      placement: normalizeBannerPlacement(input.placement),
      banner_image_position_y: frame.imagePositionY,
      image_zoom: frame.imageZoom,
      image_position_x: frame.imagePositionX,
      image_position_y: frame.imagePositionY,
      rainbow_border_enabled: frame.rainbowBorderEnabled,
      display_order: frame.displayOrder,
      status: "PENDING_PAYMENT",
      paymentId,
      startsAt: null,
      endsAt: null,
      updatedAt: now.toISOString()
    }
  });
  throwDbError(auditError);

  const { data: payment, error: paymentError } = await db()
    .from("Payment")
    .insert({
      id: paymentId,
      userId: input.userId,
      amountCents: input.amountCents,
      status: "PENDING",
      provider: "manual",
      providerRef: `banner:${campaignId}:${input.planType}:${Date.now()}`,
      updatedAt: now.toISOString()
    })
    .select("id,amountCents,status,providerRef")
    .single();
  throwDbError(paymentError);
  if (!payment) throw new Error("Não foi possível iniciar o pagamento do banner.");

  return { campaignId, payment };
}

export async function createComplimentaryBannerCampaign(input: Omit<BannerCampaignInput, "campaignId"> & { reason: string }) {
  const now = new Date();
  const plan = bannerPlans[input.planType];
  const campaignId = newDbId();
  const endsAt = addDays(now, input.periods * plan.days).toISOString();
  const frame = normalizeBannerFrame(input);

  const campaign: BannerCampaignRecord = {
    campaignId,
    userId: input.userId,
    planType: input.planType,
    bannerQuantity: input.bannerQuantity,
    periods: input.periods,
    campaignTitle: input.campaignTitle,
    destinationUrl: input.destinationUrl,
    mediaUrl: input.mediaUrl,
    bannerImagePositionY: frame.imagePositionY,
    imageZoom: frame.imageZoom,
    imagePositionX: frame.imagePositionX,
    imagePositionY: frame.imagePositionY,
    rainbowBorderEnabled: frame.rainbowBorderEnabled,
    displayOrder: frame.displayOrder,
    placement: normalizeBannerPlacement(input.placement),
    mediaType: input.mediaType,
    amountCents: 0,
    status: "ACTIVE",
    startsAt: now.toISOString(),
    endsAt,
    paymentId: null,
    updatedAt: now.toISOString()
  };

  const { error } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: input.userId,
    action: "banner.campaign.auto_complimentary",
    metadata: {
      ...campaign,
      banner_image_position_y: campaign.imagePositionY,
      image_zoom: campaign.imageZoom,
      image_position_x: campaign.imagePositionX,
      image_position_y: campaign.imagePositionY,
      rainbow_border_enabled: campaign.rainbowBorderEnabled,
      display_order: campaign.displayOrder,
      placement: campaign.placement,
      originalAmountCents: input.amountCents,
      reason: input.reason
    }
  });
  throwDbError(error);

  await createNotification(
    input.userId,
    "Banner liberado como cortesia",
    `Seu banner "${input.campaignTitle}" foi ativado sem cobrança no Banner Carrossel.`,
    {
      primaryActionLabel: "Meus banners",
      primaryActionUrl: "/dashboard#meus-banners"
    }
  );

  return campaign;
}

export async function grantComplimentaryBannerCampaign(input: {
  adminId: string;
  userId: string;
  planType: BannerPlanType;
  campaignTitle: string;
  destinationUrl: string;
  mediaUrl: string;
  placement?: BannerPlacement;
  rainbowBorderEnabled?: boolean;
  reason: string;
}) {
  const now = new Date();
  const plan = bannerPlans[input.planType];
  const campaignId = newDbId();
  const endsAt = addDays(now, plan.days).toISOString();
  const amountCents = plan.unitAmountCents;

  const campaign: BannerCampaignRecord = {
    campaignId,
    userId: input.userId,
    planType: input.planType,
    bannerQuantity: 1,
    periods: 1,
    campaignTitle: input.campaignTitle,
    destinationUrl: input.destinationUrl,
    mediaUrl: input.mediaUrl,
    bannerImagePositionY: 50,
    imageZoom: 1,
    imagePositionX: 50,
    imagePositionY: 50,
    rainbowBorderEnabled: Boolean(input.rainbowBorderEnabled),
    displayOrder: 1000,
    placement: normalizeBannerPlacement(input.placement),
    mediaType: "IMAGE",
    amountCents,
    status: "ACTIVE",
    startsAt: now.toISOString(),
    endsAt,
    paymentId: null,
    updatedAt: now.toISOString()
  };

  const { error } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: input.userId,
    action: "banner.campaign.admin_granted",
    metadata: {
      ...campaign,
      banner_image_position_y: campaign.bannerImagePositionY,
      image_zoom: campaign.imageZoom,
      image_position_x: campaign.imagePositionX,
      image_position_y: campaign.imagePositionY,
      rainbow_border_enabled: campaign.rainbowBorderEnabled,
      display_order: campaign.displayOrder,
      placement: campaign.placement,
      adminId: input.adminId,
      reason: input.reason
    }
  });
  throwDbError(error);

  await createNotification(
    input.userId,
    "Banner cortesia liberado",
    `Você ganhou uma cortesia ${plan.name} para anunciar sua marca no Banner Carrossel.`,
    {
      primaryActionLabel: "Editar banner",
      primaryActionUrl: "/dashboard#meus-banners"
    }
  );

  return campaign;
}

export async function confirmBannerPayment(payment: { id: string; userId: string; status: string; providerRef: string | null; updatedAt: string | null }) {
  const reference = parseBannerProviderRef(payment.providerRef);
  if (!reference) throw new Error("Pagamento não possui referência de banner válida.");

  const campaign = await findBannerCampaign(reference.campaignId, payment.userId);
  if (!campaign) throw new Error("Campanha de banner não encontrada para confirmação.");

  const now = new Date();
  const paidAt = payment.status === "PAID" && payment.updatedAt ? new Date(payment.updatedAt) : now;
  const safePaidAt = Number.isFinite(paidAt.getTime()) ? paidAt : now;

  if (payment.status !== "PAID") {
    const { error: updatePaymentError } = await db()
      .from("Payment")
      .update({ status: "PAID", updatedAt: safePaidAt.toISOString() })
      .eq("id", payment.id)
      .eq("status", "PENDING");
    throwDbError(updatePaymentError);
  }

  if (campaign.status === "ACTIVE" && campaign.endsAt) return payment;

  const plan = bannerPlans[campaign.planType];
  const endsAt = addDays(safePaidAt, campaign.periods * plan.days).toISOString();

  const { error: auditError } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: payment.userId,
    action: "banner.campaign.activated",
    metadata: {
      ...campaign,
      status: "ACTIVE",
      paymentId: payment.id,
      startsAt: safePaidAt.toISOString(),
      endsAt,
      updatedAt: safePaidAt.toISOString()
    }
  });
  throwDbError(auditError);

  await createNotification(
    payment.userId,
    "Banner ativado",
    `Seu banner "${campaign.campaignTitle}" foi ativado no Banner Carrossel.`,
    {
      primaryActionLabel: "Meus banners",
      primaryActionUrl: "/dashboard#meus-banners"
    }
  );

  return { ...payment, status: "PAID" };
}

export async function findBannerCampaign(campaignId: string, userId?: string | null) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .in("action", bannerCampaignActions)
    .order("createdAt", { ascending: true })
    .limit(500);
  throwDbError(error);

  const campaigns = reduceCampaignEvents(data ?? []);
  const campaign = campaigns.find((item) => item.campaignId === campaignId) ?? null;
  if (campaign && userId && campaign.userId !== userId) return null;
  return campaign;
}

export async function findUserBannerCampaigns(userId: string) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .in("action", bannerCampaignActions)
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(500);
  throwDbError(error);

  return sortBannerCampaigns(reduceCampaignEvents(data ?? []), "user");
}

export async function findActiveBannerSlots(limit = 5) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .in("action", bannerCampaignActions)
    .order("createdAt", { ascending: true })
    .limit(500);
  throwDbError(error);

  const now = Date.now();
  return sortBannerCampaigns(
    reduceCampaignEvents(data ?? []).filter((item) => item.placement === "CAROUSEL" && item.status === "ACTIVE" && item.endsAt && Date.parse(item.endsAt) > now),
    "carousel"
  ).slice(0, limit);
}

export async function findActiveDesktopHeroBanner() {
  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .in("action", bannerCampaignActions)
    .order("createdAt", { ascending: true })
    .limit(500);
  throwDbError(error);

  const now = Date.now();
  return sortBannerCampaigns(
    reduceCampaignEvents(data ?? []).filter((item) => item.placement === "DESKTOP_HERO" && item.status === "ACTIVE" && item.endsAt && Date.parse(item.endsAt) > now),
    "carousel"
  )[0] ?? null;
}

export async function findActiveBannerCampaignsForAdmin(limit = 50) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("metadata,createdAt")
    .in("action", bannerCampaignActions)
    .order("createdAt", { ascending: true })
    .limit(1000);
  throwDbError(error);

  const now = Date.now();
  return sortBannerCampaigns(
    reduceCampaignEvents(data ?? []).filter((item) => item.status === "ACTIVE" && item.endsAt && Date.parse(item.endsAt) > now),
    "carousel"
  ).slice(0, limit);
}

export async function updateActiveBannerCampaign(input: {
  campaignId: string;
  userId: string;
  campaignTitle: string;
  destinationUrl: string;
  mediaUrl: string;
  bannerImagePositionY: number;
  imageZoom: number;
  imagePositionX: number;
  imagePositionY: number;
  rainbowBorderEnabled: boolean;
}) {
  const campaign = await findBannerCampaign(input.campaignId, input.userId);
  if (!campaign) throw new Error("Banner não encontrado.");
  if (campaign.status !== "ACTIVE" || !campaign.endsAt || Date.parse(campaign.endsAt) <= Date.now()) {
    throw new Error("Este banner só pode ser editado enquanto estiver pago e ativo.");
  }

  const frame = normalizeBannerFrame(input);
  const updated: BannerCampaignRecord = {
    ...campaign,
    campaignTitle: input.campaignTitle,
    destinationUrl: input.destinationUrl,
    mediaUrl: input.mediaUrl,
    bannerImagePositionY: frame.imagePositionY,
    imageZoom: frame.imageZoom,
    imagePositionX: frame.imagePositionX,
    imagePositionY: frame.imagePositionY,
    rainbowBorderEnabled: frame.rainbowBorderEnabled,
    updatedAt: new Date().toISOString()
  };

  const { error } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: input.userId,
    action: "banner.campaign.updated",
    metadata: {
      ...updated,
      banner_image_position_y: updated.imagePositionY,
      image_zoom: updated.imageZoom,
      image_position_x: updated.imagePositionX,
      image_position_y: updated.imagePositionY,
      rainbow_border_enabled: updated.rainbowBorderEnabled,
      display_order: updated.displayOrder
    }
  });
  throwDbError(error);

  return updated;
}

export async function removeBannerCampaign(input: { campaignId: string; userId: string }) {
  const campaign = await findBannerCampaign(input.campaignId, input.userId);
  if (!campaign) throw new Error("Banner não encontrado.");
  if (campaign.status === "REMOVED") return campaign;

  const now = new Date().toISOString();
  const removed: BannerCampaignRecord = {
    ...campaign,
    status: "REMOVED",
    endsAt: campaign.endsAt && Date.parse(campaign.endsAt) < Date.now() ? campaign.endsAt : now,
    updatedAt: now
  };

  const { error } = await db().from("AuditLog").insert({
    id: newDbId(),
    userId: input.userId,
    action: "banner.campaign.removed",
    metadata: removed
  });
  throwDbError(error);

  return removed;
}

export async function reorderUserBannerCampaign(input: { userId: string; campaignId: string; direction: "up" | "down" }) {
  const campaigns = withEffectiveDisplayOrders((await findUserBannerCampaigns(input.userId)).filter((item) => item.status !== "REMOVED"));
  const currentIndex = campaigns.findIndex((item) => item.campaignId === input.campaignId);
  if (currentIndex < 0) throw new Error("Banner não encontrado.");
  const targetIndex = input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= campaigns.length) return campaigns[currentIndex];
  return persistBannerOrderSwap(campaigns[currentIndex], campaigns[targetIndex], input.userId, "banner.campaign.user_reordered");
}

export async function reorderAdminBannerCampaign(input: { adminId: string; campaignId: string; direction: "up" | "down" }) {
  const campaigns = withEffectiveDisplayOrders(await findActiveBannerCampaignsForAdmin(100));
  const currentIndex = campaigns.findIndex((item) => item.campaignId === input.campaignId);
  if (currentIndex < 0) throw new Error("Banner não encontrado.");
  const targetIndex = input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= campaigns.length) return campaigns[currentIndex];
  return persistBannerOrderSwap(campaigns[currentIndex], campaigns[targetIndex], input.adminId, "banner.campaign.admin_reordered");
}

async function persistBannerOrderSwap(current: BannerCampaignRecord, target: BannerCampaignRecord, actorId: string, action: string) {
  const currentOrder = normalizeDisplayOrder(current.displayOrder);
  const targetOrder = normalizeDisplayOrder(target.displayOrder);
  const now = new Date().toISOString();
  const currentUpdated: BannerCampaignRecord = { ...current, displayOrder: targetOrder, updatedAt: now };
  const targetUpdated: BannerCampaignRecord = { ...target, displayOrder: currentOrder, updatedAt: now };

  const { error } = await db().from("AuditLog").insert([
    {
      id: newDbId(),
      userId: actorId,
      action,
      metadata: serializeBannerCampaign(currentUpdated, { actorId, swappedWithCampaignId: target.campaignId })
    },
    {
      id: newDbId(),
      userId: actorId,
      action,
      metadata: serializeBannerCampaign(targetUpdated, { actorId, swappedWithCampaignId: current.campaignId })
    }
  ]);
  throwDbError(error);

  return currentUpdated;
}

function reduceCampaignEvents(rows: Array<{ metadata: any; createdAt?: string | null }>) {
  const campaigns = new Map<string, BannerCampaignRecord>();

  for (const row of rows) {
    const metadata = row.metadata;
    if (!isRecord(metadata) || typeof metadata.campaignId !== "string" || !isBannerPlanType(metadata.planType)) continue;

    campaigns.set(metadata.campaignId, {
      campaignId: metadata.campaignId,
      userId: String(metadata.userId ?? ""),
      planType: metadata.planType,
      bannerQuantity: numberOr(metadata.bannerQuantity, 1),
      periods: numberOr(metadata.periods, 1),
      campaignTitle: String(metadata.campaignTitle ?? "Banner patrocinado"),
      destinationUrl: String(metadata.destinationUrl ?? ""),
      mediaUrl: String(metadata.mediaUrl ?? ""),
      bannerImagePositionY: normalizePercent(metadata.imagePositionY ?? metadata.image_position_y ?? metadata.bannerImagePositionY ?? metadata.banner_image_position_y),
      imageZoom: normalizeImageZoom(metadata.imageZoom ?? metadata.image_zoom),
      imagePositionX: normalizePercent(metadata.imagePositionX ?? metadata.image_position_x),
      imagePositionY: normalizePercent(metadata.imagePositionY ?? metadata.image_position_y ?? metadata.bannerImagePositionY ?? metadata.banner_image_position_y),
      rainbowBorderEnabled: Boolean(metadata.rainbowBorderEnabled ?? metadata.rainbow_border_enabled ?? defaultRainbowBorderCampaignIds.has(metadata.campaignId)),
      displayOrder: normalizeDisplayOrder(metadata.displayOrder ?? metadata.display_order),
      placement: normalizeBannerPlacement(metadata.placement ?? metadata.bannerPlacement ?? metadata.banner_placement),
      mediaType: "IMAGE",
      amountCents: numberOr(metadata.amountCents, 0),
      status: metadata.status === "ACTIVE" ? "ACTIVE" : metadata.status === "REMOVED" ? "REMOVED" : metadata.status === "DRAFT" ? "DRAFT" : "PENDING_PAYMENT",
      startsAt: typeof metadata.startsAt === "string" ? metadata.startsAt : null,
      endsAt: typeof metadata.endsAt === "string" ? metadata.endsAt : null,
      paymentId: typeof metadata.paymentId === "string" ? metadata.paymentId : null,
      updatedAt: typeof metadata.updatedAt === "string" ? metadata.updatedAt : row.createdAt ?? new Date(0).toISOString()
    });
  }

  return [...campaigns.values()];
}

const bannerCampaignActions = [
  "banner.campaign.created",
  "banner.campaign.activated",
  "banner.campaign.updated",
  "banner.campaign.admin_granted",
  "banner.campaign.auto_complimentary",
  "banner.campaign.removed",
  "banner.campaign.user_reordered",
  "banner.campaign.admin_reordered"
];

function isBannerPlanType(value: unknown): value is BannerPlanType {
  return value === "TOP_15" || value === "TOP_30";
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePercent(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeImageZoom(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(3, Math.round(number * 100) / 100));
}

function normalizeDisplayOrder(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(number)) return 1000;
  return Math.max(0, Math.min(999999, Math.round(number)));
}

function normalizeBannerFrame(value: { bannerImagePositionY?: unknown; imageZoom?: unknown; imagePositionX?: unknown; imagePositionY?: unknown; rainbowBorderEnabled?: unknown; displayOrder?: unknown }) {
  const imagePositionY = normalizePercent(value.imagePositionY ?? value.bannerImagePositionY);
  return {
    imageZoom: normalizeImageZoom(value.imageZoom),
    imagePositionX: normalizePercent(value.imagePositionX),
    imagePositionY,
    rainbowBorderEnabled: Boolean(value.rainbowBorderEnabled),
    displayOrder: normalizeDisplayOrder(value.displayOrder)
  };
}

function serializeBannerCampaign(campaign: BannerCampaignRecord, extra?: Record<string, unknown>) {
  return {
    ...campaign,
    bannerImagePositionY: campaign.imagePositionY,
    banner_image_position_y: campaign.imagePositionY,
    image_zoom: campaign.imageZoom,
    image_position_x: campaign.imagePositionX,
    image_position_y: campaign.imagePositionY,
    rainbowBorderEnabled: campaign.rainbowBorderEnabled,
    rainbow_border_enabled: campaign.rainbowBorderEnabled,
    display_order: campaign.displayOrder,
    placement: campaign.placement,
    ...extra
  };
}

function sortBannerCampaigns(campaigns: BannerCampaignRecord[], mode: "carousel" | "user") {
  return [...campaigns].sort((a, b) => {
    const orderDiff = normalizeDisplayOrder(a.displayOrder) - normalizeDisplayOrder(b.displayOrder);
    if (orderDiff !== 0) return orderDiff;
    const startsDiff = Date.parse(a.startsAt ?? a.updatedAt) - Date.parse(b.startsAt ?? b.updatedAt);
    if (startsDiff !== 0) return startsDiff;
    const updatedDiff = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    return mode === "carousel" ? updatedDiff : -updatedDiff;
  });
}

function withEffectiveDisplayOrders(campaigns: BannerCampaignRecord[]) {
  return campaigns.map((campaign, index) => ({
    ...campaign,
    displayOrder: normalizeDisplayOrder(campaign.displayOrder) === 1000 ? (index + 1) * 10 : normalizeDisplayOrder(campaign.displayOrder)
  }));
}

function normalizeBannerPlacement(value: unknown): BannerPlacement {
  return value === "DESKTOP_HERO" || value === "desktop-hero" ? "DESKTOP_HERO" : "CAROUSEL";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
