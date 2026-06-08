import { randomUUID } from "crypto";
import { parseServiceComplement } from "@/lib/service-contact-disclosure";

type ServiceSearchItem = {
  id: string;
};

type ExposureState = {
  complemento: Record<string, any>;
  searchImpressions: number;
  lastSearchImpressionAt: string | null;
};

export async function orderAndRecordServiceSearchExposure<T extends ServiceSearchItem>(supabase: any, items: T[]) {
  if (!items.length) return items;

  const ids = [...new Set(items.map((item) => item.id))];
  const { data, error } = await supabase
    .from("service_profiles")
    .select("id,complemento")
    .in("id", ids);
  if (error) throw error;

  const exposureById = new Map<string, ExposureState>();
  for (const row of data ?? []) {
    exposureById.set(row.id, readExposure(row.complemento));
  }

  const tieBreakers = new Map(items.map((item) => [item.id, Math.random()]));
  const ordered = [...items].sort((left, right) => {
    const leftExposure = exposureById.get(left.id) ?? readExposure(null);
    const rightExposure = exposureById.get(right.id) ?? readExposure(null);
    if (leftExposure.searchImpressions !== rightExposure.searchImpressions) {
      return leftExposure.searchImpressions - rightExposure.searchImpressions;
    }

    const leftLast = lastSeenMs(leftExposure.lastSearchImpressionAt);
    const rightLast = lastSeenMs(rightExposure.lastSearchImpressionAt);
    if (leftLast !== rightLast) return leftLast - rightLast;

    return (tieBreakers.get(left.id) ?? 0) - (tieBreakers.get(right.id) ?? 0);
  });

  await recordSearchImpressions(supabase, ordered, exposureById);
  return ordered;
}

function readExposure(complement: string | null | undefined): ExposureState {
  const complemento = parseServiceComplement(complement);
  const exposure = complemento.serviceSearchExposure && typeof complemento.serviceSearchExposure === "object"
    ? complemento.serviceSearchExposure
    : {};
  const searchImpressions = Number(exposure.searchImpressions ?? 0);
  const lastSearchImpressionAt = typeof exposure.lastSearchImpressionAt === "string"
    ? exposure.lastSearchImpressionAt
    : typeof exposure.lastSearchImpression === "string"
      ? exposure.lastSearchImpression
      : null;

  return {
    complemento,
    searchImpressions: Number.isFinite(searchImpressions) && searchImpressions > 0 ? Math.floor(searchImpressions) : 0,
    lastSearchImpressionAt
  };
}

function lastSeenMs(value: string | null) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

async function recordSearchImpressions<T extends ServiceSearchItem>(supabase: any, items: T[], exposureById: Map<string, ExposureState>) {
  const nowIso = new Date().toISOString();
  const updates = items.map((item) => {
    const current = exposureById.get(item.id) ?? readExposure(null);
    const complemento = {
      ...current.complemento,
      serviceSearchExposure: {
        ...(current.complemento.serviceSearchExposure ?? {}),
        searchImpressions: current.searchImpressions + 1,
        lastSearchImpressionAt: nowIso
      }
    };
    return supabase
      .from("service_profiles")
      .update({ complemento: JSON.stringify(complemento) })
      .eq("id", item.id);
  });

  for (let index = 0; index < updates.length; index += 20) {
    const results = await Promise.all(updates.slice(index, index + 20));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  }

  const { error } = await supabase.from("AuditLog").insert({
    id: randomUUID(),
    userId: null,
    action: "service.search_impressions.recorded",
    metadata: {
      profileIds: items.map((item) => item.id),
      total: items.length,
      recordedAt: nowIso
    }
  });
  if (error) throw error;
}
