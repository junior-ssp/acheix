import { NextResponse } from "next/server";
import { requireBackofficeUser, requireSuperAdmin } from "@/lib/admin-auth";
import { bannerPlans, grantComplimentaryBannerCampaign, type BannerPlanType } from "@/lib/banner-campaigns";
import { canShareCpfBetween } from "@/lib/cpf-sharing-exceptions";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { messageSafetyConfigAction, parseBlockedTermsText } from "@/lib/message-safety";
import { createNotification } from "@/lib/notifications";
import { listingTopRefreshActivationFields } from "@/lib/listing-top-refresh-policy";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";
import { isValidCpf } from "@/lib/validators";

export const dynamic = "force-dynamic";

const listingStatusByAction: Record<string, "ACTIVE" | "REJECTED" | "EXPIRED" | "PENDING_REVIEW"> = {
  hide_listing: "PENDING_REVIEW",
  remove_listing: "EXPIRED",
  restore_listing: "ACTIVE"
};

function redirectBack(request: Request) {
  return NextResponse.redirect(new URL("/admin", request.url));
}

function redirectAdmin(request: Request, formData: FormData, fallback = "/admin") {
  const returnTo = String(formData.get("returnTo") ?? "");
  const target = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;
  return NextResponse.redirect(new URL(target, request.url));
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "");
    const note = String(formData.get("note") ?? "").trim() || null;
    const admin = action.startsWith("user_") || action === "grant_user_plan" || action === "grant_banner_plan" || action === "delete_service_profile" || action === "block_service_provider" || action === "unblock_service_provider" || action === "update_message_safety_keywords" || action === "approve_cpf_change" || action === "reject_cpf_change"
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

    if (action === "approve_cpf_change" || action === "reject_cpf_change") {
      const requestId = String(formData.get("requestId") ?? "");
      if (!requestId) return json({ error: "Solicitação não informada." }, 422);
      const changeRequest = await findCpfChangeRequest(requestId);
      if (!changeRequest) return json({ error: "Solicitação não encontrada." }, 404);
      if (changeRequest.status !== "PENDING_REVIEW") return json({ error: "Esta solicitação já foi analisada." }, 409);
      const now = new Date().toISOString();

      if (action === "reject_cpf_change") {
        const rejectionNote = note ?? "Reprovado pelo Admin.";
        const { error } = await db().from("CpfChangeRequest").update({
          status: "REJECTED",
          reviewedBy: admin.id,
          reviewedAt: now,
          reviewNote: rejectionNote,
          updatedAt: now
        }).eq("id", changeRequest.id);
        throwDbError(error);
        await createNotification(changeRequest.userId, "Troca de CPF reprovada", `Sua solicitação de troca de CPF foi reprovada. Motivo: ${rejectionNote}`, {
          primaryActionLabel: "Ver meus dados",
          primaryActionUrl: "/dashboard#perfil"
        });
        await insertAudit(admin.id, "admin.cpf_change.reject", { requestId, targetUserId: changeRequest.userId, note: rejectionNote, ip, adminLevel: admin.adminAccessLevel });
        return redirectAdmin(request, formData, "/admin#cpf");
      }

      const requestedCpf = onlyDigits(changeRequest.requestedCpf);
      if (!isValidCpf(requestedCpf)) return json({ error: "CPF solicitado inválido." }, 422);
      const targetUser = await findUser(changeRequest.userId);
      if (!targetUser) return json({ error: "Usuário não encontrado." }, 404);
      const { data: duplicate, error: duplicateError } = await db()
        .from("User")
        .select("id,email")
        .eq("cpf", requestedCpf)
        .neq("id", changeRequest.userId);
      throwDbError(duplicateError);
      const blockedDuplicate = (duplicate ?? []).find((item) => !canShareCpfBetween(targetUser.email, item.email));
      if (blockedDuplicate) return json({ error: "Este CPF já está cadastrado em outra conta." }, 409);

      const { error: userError } = await db().from("User").update({
        cpf: requestedCpf,
        cpfVerifiedAt: now,
        identityVerifiedAt: now,
        verificationProvider: "admin_document_review",
        updatedAt: now
      }).eq("id", changeRequest.userId);
      throwDbError(userError);
      const { error: requestError } = await db().from("CpfChangeRequest").update({
        status: "APPROVED",
        reviewedBy: admin.id,
        reviewedAt: now,
        reviewNote: note,
        updatedAt: now
      }).eq("id", changeRequest.id);
      throwDbError(requestError);
      await createNotification(changeRequest.userId, "CPF Aprovado", "Seu CPF foi conferido e aprovado. Seu cadastro já foi atualizado e você pode continuar usando o Achei X normalmente.", {
        primaryActionLabel: "Ver meus dados",
        primaryActionUrl: "/dashboard#perfil"
      });
      await insertAudit(admin.id, "admin.cpf_change.approve", { requestId, targetUserId: changeRequest.userId, requestedCpf, ocrCpfMatched: changeRequest.ocrCpfMatched, note, ip, adminLevel: admin.adminAccessLevel });
      return redirectAdmin(request, formData, "/admin#cpf");
    }

    if (listingStatusByAction[action]) {
      const listingId = String(formData.get("listingId") ?? "");
      if (!listingId) return json({ error: "Anúncio não informado." }, 422);
      const nextStatus = listingStatusByAction[action];
      const now = new Date();
      const currentListing = nextStatus === "ACTIVE" ? await findListingForTopRefresh(listingId) : null;
      const topRefreshFields = nextStatus === "ACTIVE" && currentListing?.plan?.code ? listingTopRefreshActivationFields(currentListing.plan.code, now) : {};
      const { data: listing, error } = await db().from("Listing").update({ status: nextStatus, updatedAt: now.toISOString(), ...topRefreshFields }).eq("id", listingId).select("id,ownerId,slug,title,status").single();
      throwDbError(error);
      if (!listing) return json({ error: "Anúncio não encontrado." }, 404);
      if (action === "remove_listing") {
        await createNotification(listing.ownerId, "Anúncio Removido", `Seu anúncio "${listing.title}" foi removido pelo Sistema de Segurança do Achei X.`, { linkLabel: "Ver Meus Anúncios", linkUrl: "/dashboard" });
      }
      await insertAudit(admin.id, `admin.listing.${action}`, { listingId: listing.id, slug: listing.slug, title: listing.title, status: listing.status, note, ip, adminLevel: admin.adminAccessLevel });
      return redirectAdmin(request, formData, "/admin#anuncios");
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

    if (action === "grant_user_plan") {
      const targetUserId = String(formData.get("targetUserId") ?? "");
      const planId = String(formData.get("planId") ?? "");
      const durationPreset = "PLAN";
      const reason = String(formData.get("reason") ?? "").trim();
      if (!targetUserId) return json({ error: "Usuário não informado." }, 422);
      if (!planId) return json({ error: "Plano não informado." }, 422);
      if (!reason) return json({ error: "Motivo obrigatório." }, 422);

      const [target, plan, listings] = await Promise.all([
        findUser(targetUserId),
        findPlan(planId),
        findUserListings(targetUserId)
      ]);
      if (!target) return json({ error: "Usuário não encontrado." }, 404);
      if (!plan) return json({ error: "Plano não encontrado." }, 404);

      const eligibleListings = listings.filter((listing) => ["ACTIVE", "PENDING_REVIEW", "EXPIRED"].includes(listing.status));
      const skippedListings = listings.filter((listing) => !eligibleListings.some((eligible) => eligible.id === listing.id));
      const affectedListingIds = eligibleListings.map((listing) => listing.id);
      const previousPlanId = eligibleListings[0]?.planId ?? listings[0]?.planId ?? null;
      const startsAt = new Date();
      const durationDays = Math.max(Number(plan.durationDays ?? 0), 1);
      const endsAt = new Date(startsAt.getTime() + durationDays * 86400000);

      if (affectedListingIds.length) {
        const { error: updateListingsError } = await db()
          .from("Listing")
          .update({
            planId: plan.id,
            status: "ACTIVE",
            expiresAt: endsAt.toISOString(),
            expiredNotifiedAt: null,
            updatedAt: startsAt.toISOString()
          })
          .in("id", affectedListingIds);
        throwDbError(updateListingsError);
        await syncListingSubscriptions(affectedListingIds, plan.id, startsAt, endsAt);
      }

      const grantId = newDbId();
      const { error: grantError } = await db().from("AdminPlanGrant").insert({
        id: grantId,
        adminId: admin.id,
        targetUserId: target.id,
        previousPlanId,
        newPlanId: plan.id,
        durationPreset,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason,
        affectedListingIds,
        skippedListingIds: skippedListings.map((listing) => listing.id)
      });
      if (grantError && !isMissingSupabaseRelation(grantError)) throwDbError(grantError);

      await insertAudit(admin.id, "admin.user.grant_plan", {
        grantId,
        targetUserId: target.id,
        targetName: target.name,
        targetEmail: target.email,
        previousPlanId,
        newPlanId: plan.id,
        newPlanCode: plan.code,
        newPlanName: plan.name,
        durationPreset,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        affectedListingIds,
        skippedListingIds: skippedListings.map((listing) => listing.id),
        reason,
        ip,
        adminLevel: admin.adminAccessLevel
      });

      await createNotification(target.id, "Plano atualizado pelo Admin", `Seu plano foi atualizado para ${plan.name}. Validade até ${endsAt.toLocaleDateString("pt-BR")}.`, {
        primaryActionLabel: "Ver meus anúncios",
        primaryActionUrl: "/dashboard?meus=ALL#meus-anuncios"
      });

      return NextResponse.redirect(new URL("/admin#usuarios", request.url));
    }

    if (action === "grant_banner_plan") {
      const targetUserId = String(formData.get("targetUserId") ?? "");
      const planType = String(formData.get("bannerPlanType") ?? "") as BannerPlanType;
      const reason = String(formData.get("reason") ?? "").trim();
      if (!targetUserId) return json({ error: "Usuário não informado." }, 422);
      if (planType !== "TOP_15" && planType !== "TOP_30") return json({ error: "Plano de banner não informado." }, 422);
      if (!reason) return json({ error: "Motivo obrigatório." }, 422);

      const target = await findUser(targetUserId);
      if (!target) return json({ error: "Usuário não encontrado." }, 404);

      const campaign = await grantComplimentaryBannerCampaign({
        adminId: admin.id,
        userId: target.id,
        planType,
        campaignTitle: "Banner Cortesia - Achei X",
        destinationUrl: "https://acheix.com.br",
        mediaUrl: "https://acheix.com.br/achei-x-logo-small.png",
        rainbowBorderEnabled: false,
        reason
      });

      await insertAudit(admin.id, "admin.user.grant_banner_plan", {
        targetUserId: target.id,
        targetName: target.name,
        targetEmail: target.email,
        campaignId: campaign.campaignId,
        bannerPlanType: planType,
        bannerPlanName: bannerPlans[planType].name,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        reason,
        ip,
        adminLevel: admin.adminAccessLevel
      });

      return NextResponse.redirect(new URL("/admin#usuarios", request.url));
    }

    if (action === "user_suspend" || action === "user_pause_content" || action === "user_block" || action === "user_reactivate" || action === "user_delete") {
      const targetUserId = String(formData.get("targetUserId") ?? "");
      if (!targetUserId) return json({ error: "Usuário não informado." }, 422);
      const target = await findUser(targetUserId);
      if (!target) return json({ error: "Usuário não encontrado." }, 404);
      const now = new Date().toISOString();
      if (action === "user_delete") {
        const confirmDelete = String(formData.get("confirmDelete") ?? "");
        if (confirmDelete !== "EXCLUIR") return json({ error: "Confirmação de exclusão inválida." }, 422);
        const reason = note ?? "Usuário excluído operacionalmente pelo Admin";
        await updateUser(target.id, { accountBlockedAt: now, accountBlockedReason: reason, serviceBlockedAt: now, serviceBlockedReason: reason, updatedAt: now });
        await db().from("Listing").update({ status: "EXPIRED", updatedAt: now }).eq("ownerId", target.id).neq("status", "EXPIRED");
        await db().from("service_profiles").update({ active: false, status: "CLOSED", closed_at: now, updated_at: now }).eq("user_id", target.id);
        await insertAudit(admin.id, "admin.user.user_delete", { targetUserId: target.id, targetName: target.name, targetEmail: target.email, note: reason, ip, adminLevel: admin.adminAccessLevel, mode: "operational_delete" });
        return redirectAdmin(request, formData, "/admin#usuarios");
      }
      if (action === "user_suspend") {
        await updateUser(target.id, { accountBlockedAt: now, accountBlockedReason: note ?? "Login suspenso pelo Admin", updatedAt: now });
      }
      if (action === "user_pause_content") {
        await db().from("Listing").update({ status: "PENDING_REVIEW", updatedAt: now }).eq("ownerId", target.id).eq("status", "ACTIVE");
        await db().from("service_profiles").update({ active: false, status: "PAUSED", paused_at: now, updated_at: now }).eq("user_id", target.id);
      }
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
      return redirectAdmin(request, formData, "/admin#usuarios");
    }

    return json({ error: "Ação inválida." }, 422);
  } catch (error) {
    return errorResponse(error);
  }
}

async function findListingForTopRefresh(listingId: string) {
  const { data, error } = await db()
    .from("Listing")
    .select("id,plan:Plan!Listing_planId_fkey(code)")
    .eq("id", listingId)
    .maybeSingle();
  throwDbError(error);
  const plan = Array.isArray((data as any)?.plan) ? (data as any).plan[0] : (data as any)?.plan;
  return data ? { ...(data as any), plan } : null;
}

async function findUser(id: string) {
  const { data, error } = await db().from("User").select("id,name,email").eq("id", id).maybeSingle();
  throwDbError(error);
  return data as any;
}

async function findCpfChangeRequest(id: string) {
  const { data, error } = await db()
    .from("CpfChangeRequest")
    .select("id,userId,currentCpf,requestedCpf,status,ocrCpfMatched")
    .eq("id", id)
    .maybeSingle();
  throwDbError(error);
  return data as any;
}

async function findPlan(id: string) {
  const { data, error } = await db().from("Plan").select("id,name,code,durationDays").eq("id", id).maybeSingle();
  throwDbError(error);
  return data as any;
}

async function findUserListings(ownerId: string) {
  const { data, error } = await db().from("Listing").select("id,title,planId,status").eq("ownerId", ownerId);
  throwDbError(error);
  return (data ?? []) as Array<{ id: string; title: string; planId: string | null; status: string }>;
}

async function syncListingSubscriptions(listingIds: string[], planId: string, startsAt: Date, endsAt: Date) {
  if (!listingIds.length) return;
  const { data: subscriptions, error: findError } = await db()
    .from("Subscription")
    .select("listingId")
    .in("listingId", listingIds);
  throwDbError(findError);

  const existingListingIds = new Set(((subscriptions ?? []) as Array<{ listingId: string }>).map((subscription) => subscription.listingId));
  if (existingListingIds.size) {
    const { error: updateError } = await db()
      .from("Subscription")
      .update({
        planId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString()
      })
      .in("listingId", [...existingListingIds]);
    throwDbError(updateError);
  }

  const missingListingIds = listingIds.filter((listingId) => !existingListingIds.has(listingId));
  if (missingListingIds.length) {
    const { error: insertError } = await db().from("Subscription").insert(missingListingIds.map((listingId) => ({
      id: newDbId(),
      listingId,
      planId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString()
    })));
    throwDbError(insertError);
  }
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

function isMissingSupabaseRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "42P01" || code === "PGRST205";
}
