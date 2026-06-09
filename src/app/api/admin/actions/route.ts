import { NextResponse } from "next/server";
import { requireBackofficeUser, requireSuperAdmin } from "@/lib/admin-auth";
import { errorResponse, json } from "@/lib/http";
import { messageSafetyConfigAction, parseBlockedTermsText } from "@/lib/message-safety";
import { createNotification } from "@/lib/notifications";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const listingStatusByAction: Record<string, "ACTIVE" | "REJECTED" | "EXPIRED" | "PENDING_REVIEW"> = {
  hide_listing: "PENDING_REVIEW",
  remove_listing: "EXPIRED",
  restore_listing: "ACTIVE"
};

function redirectBack(request: Request) {
  return NextResponse.redirect(new URL("/admin", request.url));
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "");
    const note = String(formData.get("note") ?? "").trim() || null;
    const admin = action.startsWith("user_") || action === "delete_service_profile" || action === "block_service_provider" || action === "unblock_service_provider" || action === "update_message_safety_keywords"
      ? await requireSuperAdmin()
      : await requireBackofficeUser();
    const ip = requestIp(request);

    if (action === "approve_report" || action === "reject_report" || action === "request_review") {
      const caseId = String(formData.get("caseId") ?? "");
      if (!caseId) return json({ error: "Caso não informado." }, 422);
      const status = action === "reject_report" ? "RESOLVED" : action === "request_review" ? "NEEDS_REVIEW" : "PREVENTIVE_ACTION";
      const decisionAction = action === "reject_report" ? "REPORT_REJECTED" : action === "request_review" ? "REVIEW_REQUESTED" : "REPORT_APPROVED";
      const { error: caseError } = await db().from("TrustCase").update({
        status,
        requiresHumanReview: action !== "reject_report",
        moderatorNote: note,
        preventiveAction: action === "approve_report" ? "Reporte aprovado. Aplicar ação manual conforme gravidade." : null,
        updatedAt: new Date().toISOString()
      }).eq("id", caseId);
      throwDbError(caseError);
      await insertAudit(admin.id, `admin.trust_case.${action}`, { caseId, note, ip, adminLevel: admin.adminAccessLevel });
      const { error: decisionError } = await db().from("TrustDecision").insert({ id: newDbId(), caseId, moderatorId: admin.id, action: decisionAction, note });
      throwDbError(decisionError);
      return redirectBack(request);
    }

    if (action === "update_message_safety_keywords") {
      const terms = parseBlockedTermsText(String(formData.get("terms") ?? ""));
      if (!terms.length) return json({ error: "Informe pelo menos uma palavra ou frase." }, 422);
      await insertAudit(admin.id, messageSafetyConfigAction, {
        terms,
        count: terms.length,
        ip,
        adminLevel: admin.adminAccessLevel
      });
      return NextResponse.redirect(new URL("/admin#seguranca", request.url));
    }

    if (listingStatusByAction[action]) {
      const listingId = String(formData.get("listingId") ?? "");
      if (!listingId) return json({ error: "Anúncio não informado." }, 422);
      const { data: listing, error } = await db().from("Listing").update({ status: listingStatusByAction[action], updatedAt: new Date().toISOString() }).eq("id", listingId).select("id,ownerId,slug,title,status").single();
      throwDbError(error);
      if (!listing) return json({ error: "Anúncio não encontrado." }, 404);
      if (action === "remove_listing") {
        await createNotification(listing.ownerId, "Anúncio Removido", `Seu anúncio "${listing.title}" foi removido pelo Sistema de Segurança do Achei X.`, { linkLabel: "Ver Meus Anúncios", linkUrl: "/dashboard" });
      }
      await insertAudit(admin.id, `admin.listing.${action}`, { listingId: listing.id, slug: listing.slug, title: listing.title, status: listing.status, note, ip, adminLevel: admin.adminAccessLevel });
      return redirectBack(request);
    }

    if (action === "validate_service" || action === "pause_service" || action === "archive_service") {
      const profileId = String(formData.get("profileId") ?? "");
      if (!profileId) return json({ error: "Prestador não informado." }, 422);
      const now = new Date().toISOString();
      const values = action === "validate_service"
        ? { conta_verificada: true, active: true, status: "ACTIVE", updated_at: now }
        : action === "pause_service"
          ? { active: false, status: "PAUSED", paused_at: now, updated_at: now }
          : { active: false, status: "ARCHIVED", archived_at: now, updated_at: now };
      const { data: profile, error } = await db().from("service_profiles").update(values).eq("id", profileId).select("id,user_id,categoria_servico,status,conta_verificada").single();
      throwDbError(error);
      if (!profile) return json({ error: "Prestador não encontrado." }, 404);
      if (action === "validate_service") await updateUser(profile.user_id, { serviceBlockedAt: null, serviceBlockedReason: null, updatedAt: now });
      await insertAudit(admin.id, `admin.service_profile.${action}`, { profileId: profile.id, targetUserId: profile.user_id, category: profile.categoria_servico, status: profile.status, verified: profile.conta_verificada, note, ip, adminLevel: admin.adminAccessLevel });
      return redirectBack(request);
    }

    if (action === "block_service_provider" || action === "unblock_service_provider") {
      const profileId = String(formData.get("profileId") ?? "");
      if (!profileId) return json({ error: "Prestador não informado." }, 422);
      const profile = await findProfile(profileId);
      if (!profile) return json({ error: "Prestador não encontrado." }, 404);
      const now = new Date().toISOString();
      const isBlock = action === "block_service_provider";
      await updateUser(profile.user_id, isBlock ? { serviceBlockedAt: now, serviceBlockedReason: note ?? "Bloqueado pelo Admin", updatedAt: now } : { serviceBlockedAt: null, serviceBlockedReason: null, updatedAt: now });
      const profileValues = isBlock
        ? { active: false, status: "PAUSED", paused_at: now, updated_at: now }
        : profile.status === "CLOSED"
          ? { active: false, status: "CLOSED", updated_at: now }
          : { active: true, status: "ACTIVE", updated_at: now };
      const { error } = await db().from("service_profiles").update(profileValues).eq("id", profile.id);
      throwDbError(error);
      await insertAudit(admin.id, `admin.service_profile.${action}`, { profileId: profile.id, targetUserId: profile.user_id, targetUserName: profile.user?.name, targetUserEmail: profile.user?.email, category: profile.categoria_servico, note, ip, adminLevel: admin.adminAccessLevel });
      return redirectBack(request);
    }

    if (action === "delete_service_profile") {
      const profileId = String(formData.get("profileId") ?? "");
      const confirmation = String(formData.get("confirmDelete") ?? "");
      if (!profileId) return json({ error: "Prestador não informado." }, 422);
      if (confirmation !== "SIM") return json({ error: "Confirmação obrigatória." }, 422);
      const profile = await findProfile(profileId, true);
      if (!profile) return json({ error: "Prestador não encontrado." }, 404);
      const now = new Date().toISOString();
      await updateUser(profile.user_id, { serviceBlockedAt: now, serviceBlockedReason: note ?? "Prestador excluído pelo Admin", updatedAt: now });
      const { error } = await db().from("service_profiles").update({ active: false, status: "CLOSED", closed_at: now, updated_at: now }).eq("id", profile.id);
      throwDbError(error);
      await insertAudit(admin.id, "admin.service_profile.delete_profile_only", { ...auditProfileMetadata(profile, note, ip, admin.adminAccessLevel), userKept: true });
      return redirectBack(request);
    }

    if (action === "user_suspend" || action === "user_block" || action === "user_reactivate") {
      const targetUserId = String(formData.get("targetUserId") ?? "");
      if (!targetUserId) return json({ error: "Usuário não informado." }, 422);
      const target = await findUser(targetUserId);
      if (!target) return json({ error: "Usuário não encontrado." }, 404);
      const now = new Date().toISOString();
      if (action === "user_block") {
        await updateUser(target.id, { accountBlockedAt: now, accountBlockedReason: note ?? "Bloqueado pelo Admin", serviceBlockedAt: now, serviceBlockedReason: note ?? "Bloqueado pelo Admin", updatedAt: now });
        await db().from("Listing").update({ status: "PENDING_REVIEW", updatedAt: now }).eq("ownerId", target.id).eq("status", "ACTIVE");
        await db().from("service_profiles").update({ active: false, status: "PAUSED", paused_at: now, updated_at: now }).eq("user_id", target.id);
      }
      if (action === "user_reactivate") {
        await updateUser(target.id, { accountBlockedAt: null, accountBlockedReason: null, serviceBlockedAt: null, serviceBlockedReason: null, updatedAt: now });
        await db().from("service_profiles").update({ active: true, status: "ACTIVE", updated_at: now }).eq("user_id", target.id).neq("status", "CLOSED");
      }
      await insertAudit(admin.id, `admin.user.${action}`, { targetUserId: target.id, targetName: target.name, targetEmail: target.email, note, ip, adminLevel: admin.adminAccessLevel });
      return redirectBack(request);
    }

    return json({ error: "Ação inválida." }, 422);
  } catch (error) {
    return errorResponse(error);
  }
}

async function findUser(id: string) {
  const { data, error } = await db().from("User").select("id,name,email").eq("id", id).maybeSingle();
  throwDbError(error);
  return data as any;
}

async function updateUser(id: string, values: Record<string, unknown>) {
  const { error } = await db().from("User").update(values).eq("id", id);
  throwDbError(error);
}

async function findProfile(id: string, withCounts = false) {
  const { data, error } = await db().from("service_profiles").select("id,user_id,categoria_servico,status").eq("id", id).maybeSingle();
  throwDbError(error);
  if (!data) return null;
  const [user, counts] = await Promise.all([findUser((data as any).user_id), withCounts ? profileCounts(id) : Promise.resolve({ reviews: 0, contacts: 0 })]);
  return { ...(data as any), user, _count: counts };
}

async function profileCounts(profileId: string) {
  const [reviews, contacts] = await Promise.all([countRows("ServiceReview", "profileId", profileId), countRows("ServiceContact", "profileId", profileId)]);
  return { reviews, contacts };
}

async function countRows(table: string, column: string, value: string) {
  const { count, error } = await db().from(table).select("id", { count: "exact", head: true }).eq(column, value);
  throwDbError(error);
  return count ?? 0;
}

async function insertAudit(userId: string, action: string, metadata: Record<string, unknown>) {
  const { error } = await db().from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
  throwDbError(error);
}

function auditProfileMetadata(profile: any, note: string | null, ip: string, adminLevel: string) {
  return {
    profileId: profile.id,
    targetUserId: profile.user_id,
    targetUserName: profile.user?.name,
    targetUserEmail: profile.user?.email,
    category: profile.categoria_servico,
    reviews: profile._count?.reviews ?? 0,
    contacts: profile._count?.contacts ?? 0,
    note,
    ip,
    adminLevel
  };
}
