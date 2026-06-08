import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { canDeleteServiceProfile, classifyServiceProfileActivity, nextServiceConfirmationDue } from "../src/lib/service-profile-activity-policy";

type ServiceProfileRow = {
  id: string;
  user_id: string;
  status: "ACTIVE" | "NEEDS_CONFIRMATION" | "PAUSED" | "INACTIVE" | "ARCHIVED" | "DORMANT" | "CLOSED";
  last_active_at: string | null;
  updated_at: string | null;
  total_avaliacoes: number | null;
  total_servicos: number | null;
  active: boolean;
};

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Configure SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const now = new Date();
  const { data, error } = await supabase
    .from("service_profiles")
    .select("id,user_id,status,last_active_at,updated_at,total_avaliacoes,total_servicos,active")
    .in("status", ["ACTIVE", "NEEDS_CONFIRMATION", "INACTIVE", "ARCHIVED", "DORMANT"]);

  if (error) throw error;

  const counters = {
    active: 0,
    inactive: 0,
    hidden: 0,
    deleted: 0,
    unchanged: 0
  };

  for (const profile of (data ?? []) as ServiceProfileRow[]) {
    const nextStatus = classifyServiceProfileActivity(profile, now);

    if (nextStatus === "ARCHIVED" || nextStatus === "DORMANT") {
      const hasMessages = await hasServiceMessages(profile.id);
      if (canDeleteServiceProfile({ ...profile, hasMessages }, now)) {
        const { error: deleteError } = await supabase.from("service_profiles").delete().eq("id", profile.id);
        if (deleteError) throw deleteError;
        counters.deleted += 1;
        continue;
      }

      await updateProfile(profile.id, {
        status: "ARCHIVED",
        active: false,
        archived_at: now.toISOString()
      });
      counters.hidden += 1;
      continue;
    }

    if (nextStatus === profile.status && profile.active === shouldRemainSearchable(nextStatus)) {
      counters.unchanged += 1;
      continue;
    }

    if (nextStatus === "INACTIVE") {
      await updateProfile(profile.id, { status: "INACTIVE", active: true });
      counters.inactive += 1;
      continue;
    }

    if (nextStatus === "ACTIVE") {
      await updateProfile(profile.id, {
        status: "ACTIVE",
        active: true,
        activity_confirmation_due_at: nextServiceConfirmationDue(now).toISOString()
      });
      counters.active += 1;
    }
  }

  console.log("Politica de atividade de prestadores aplicada.");
  console.log(counters);
}

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
  const { error } = await supabase
    .from("service_profiles")
    .update(values)
    .eq("id", id);

  if (error) throw error;
}

function shouldRemainSearchable(status: string) {
  return status === "ACTIVE" || status === "INACTIVE";
}

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
