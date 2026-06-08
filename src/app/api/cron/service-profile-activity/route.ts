import { canDeleteServiceProfile, classifyServiceProfileActivity, nextServiceConfirmationDue } from "@/lib/service-profile-activity-policy";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ServiceProfileRow = {
  id: string;
  status: "ACTIVE" | "NEEDS_CONFIRMATION" | "PAUSED" | "INACTIVE" | "ARCHIVED" | "DORMANT" | "CLOSED";
  last_active_at: string | null;
  updated_at: string | null;
  total_avaliacoes: number | null;
  total_servicos: number | null;
  active: boolean;
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
    .select("id,status,last_active_at,updated_at,total_avaliacoes,total_servicos,active")
    .in("status", ["ACTIVE", "NEEDS_CONFIRMATION", "INACTIVE", "ARCHIVED", "DORMANT"]);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const counters = { active: 0, inactive: 0, hidden: 0, deleted: 0, unchanged: 0 };

  for (const profile of (data ?? []) as ServiceProfileRow[]) {
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
}
