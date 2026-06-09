import { canDeleteServiceProfile, classifyServiceProfileActivity, nextServiceConfirmationDue } from "@/lib/service-profile-activity-policy";
import { deliverUserNotice } from "@/lib/notifications";
import { dueServiceBillingAlerts, ensureServiceBilling, refreshServiceBillingStatus, serviceBillingAlertText } from "@/lib/service-billing-policy";
import { getSupabaseAdmin } from "@/lib/supabase";
import { newDbId } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

type ServiceProfileRow = {
  id: string;
  status: "ACTIVE" | "NEEDS_CONFIRMATION" | "PAUSED" | "INACTIVE" | "ARCHIVED" | "DORMANT" | "CLOSED";
  last_active_at: string | null;
  updated_at: string | null;
  total_avaliacoes: number | null;
  total_servicos: number | null;
  active: boolean;
  complemento: string | null;
  user_id: string;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const { data, error } = await supabase
    .from("service_profiles")
    .select("id,user_id,status,last_active_at,updated_at,total_avaliacoes,total_servicos,active,complemento")
    .in("status", ["ACTIVE", "NEEDS_CONFIRMATION", "INACTIVE", "ARCHIVED", "DORMANT"]);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const counters = { active: 0, inactive: 0, hidden: 0, deleted: 0, unchanged: 0, billingAlerts: 0, billingHidden: 0 };

  for (const profile of (data ?? []) as ServiceProfileRow[]) {
    const billingResult = await processServiceBilling(profile);
    counters.billingAlerts += billingResult.alerts;
    if (billingResult.hidden) {
      counters.billingHidden += 1;
      continue;
    }

    const nextStatus = classifyServiceProfileActivity(profile, now);

    if (nextStatus === "ARCHIVED" || nextStatus === "DORMANT") {
      const hasMessages = await hasServiceMessages(profile.id);
      if (canDeleteServiceProfile({ ...profile, hasMessages }, now)) {
        const { error: deleteError } = await supabase.from("service_profiles").delete().eq("id", profile.id);
        if (deleteError) return Response.json({ error: deleteError.message }, { status: 400 });
        counters.deleted += 1;
      } else {
        await updateProfile(profile.id, { status: "ARCHIVED", active: false, archived_at: now.toISOString() });
        counters.hidden += 1;
      }
      continue;
    }

    if (nextStatus === profile.status && profile.active === (nextStatus === "ACTIVE" || nextStatus === "INACTIVE")) {
      counters.unchanged += 1;
      continue;
    }

    if (nextStatus === "INACTIVE") {
      await updateProfile(profile.id, { status: "INACTIVE", active: true });
      counters.inactive += 1;
    } else if (nextStatus === "ACTIVE") {
      await updateProfile(profile.id, { status: "ACTIVE", active: true, activity_confirmation_due_at: nextServiceConfirmationDue(now).toISOString() });
      counters.active += 1;
    }
  }

  return Response.json({ ok: true, counters });

  async function hasServiceMessages(profileId: string) {
    const [contacts, reviews] = await Promise.all([
      supabase.from("ServiceContact").select("id", { count: "exact", head: true }).eq("profileId", profileId),
      supabase.from("ServiceReview").select("id", { count: "exact", head: true }).eq("profileId", profileId)
    ]);
    if (contacts.error) throw contacts.error;
    if (reviews.error) throw reviews.error;
    return Number(contacts.count ?? 0) > 0 || Number(reviews.count ?? 0) > 0;
  }

  async function updateProfile(id: string, values: Record<string, unknown>) {
    const { error: updateError } = await supabase
      .from("service_profiles")
      .update(values)
      .eq("id", id);
    if (updateError) throw updateError;
  }

  async function processServiceBilling(profile: ServiceProfileRow) {
    const complement = parseComplement(profile.complemento);
    const billing = refreshServiceBillingStatus(ensureServiceBilling(complement.serviceBilling, now), now);
    const alerts = dueServiceBillingAlerts(billing, now);
    let sent = 0;

    for (const alertKey of alerts) {
      const user = await findUser(profile.user_id);
      if (user) {
        const text = serviceBillingAlertText(alertKey, billing);
        await deliverUserNotice(user, text.title, text.message, {
          linkLabel: "Ver meus serviços",
          linkUrl: "/dashboard#meus-servicos",
          primaryActionLabel: "Ver meus serviços",
          primaryActionUrl: "/dashboard#meus-servicos"
        });
      }
      billing.alertsSent = { ...(billing.alertsSent ?? {}), [alertKey]: now.toISOString() };
      await insertAudit(profile.user_id, "service.billing.alert", { profileId: profile.id, alertKey, periodEndsAt: billing.currentPeriodEndsAt, graceEndsAt: billing.graceEndsAt });
      sent += 1;
    }

    const nextComplement = JSON.stringify({ ...complement, serviceBilling: billing });
    if (billing.status === "HIDDEN") {
      const wasVisible = profile.active || profile.status === "ACTIVE";
      if (wasVisible || sent > 0 || profile.complemento !== nextComplement) {
        await updateProfile(profile.id, { active: false, status: "INACTIVE", complemento: nextComplement, updated_at: now.toISOString() });
      }
      if (wasVisible) {
        await insertAudit(profile.user_id, "service.billing.hidden_after_grace", { profileId: profile.id, periodEndsAt: billing.currentPeriodEndsAt, graceEndsAt: billing.graceEndsAt, userKept: true });
      }
      return { alerts: sent, hidden: wasVisible };
    }

    if (sent > 0 || profile.complemento !== nextComplement) {
      await updateProfile(profile.id, { complemento: nextComplement, updated_at: now.toISOString() });
    }
    return { alerts: sent, hidden: false };
  }

  async function findUser(userId: string) {
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("id,email,phone,whatsapp,notificationChannel,notificationChannels")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;
    return user as any;
  }

  async function insertAudit(userId: string, action: string, metadata: Record<string, unknown>) {
    const { error: auditError } = await supabase.from("AuditLog").insert({ id: newDbId(), userId, action, metadata });
    if (auditError) throw auditError;
  }
}

function parseComplement(value: string | null | undefined) {
  if (!value) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {} as Record<string, any>;
  }
}
