import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { serviceBillingFromComplement } from "@/lib/service-billing-policy";
import { nextServiceConfirmationDue } from "@/lib/service-profile-activity-policy";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const activitySchema = z.object({
  action: z.enum(["CONFIRM", "PAUSE", "CLOSE"])
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const { action } = activitySchema.parse(await request.json());
    const supabase = getSupabaseAdmin();
    const now = new Date();

    const { data: profile, error: lookupError } = await supabase
      .from("service_profiles")
      .select("id,complemento")
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!profile) return json({ error: "Perfil de serviço não encontrado." }, 404);

    const billing = serviceBillingFromComplement(profile.complemento, now);
    if (action === "CONFIRM" && billing.status === "HIDDEN") {
      return json({ error: "Seu perfil está pendente de renovação. Renove o plano de serviços para voltar às buscas." }, 402);
    }

    const payload =
      action === "CONFIRM"
        ? {
            status: "ACTIVE",
            active: true,
            last_active_at: now.toISOString(),
            activity_confirmation_due_at: nextServiceConfirmationDue(now).toISOString(),
            activity_prompted_at: null,
            paused_at: null,
            closed_at: null,
            updated_at: now.toISOString()
          }
        : action === "PAUSE"
          ? {
              status: "PAUSED",
              active: false,
              paused_at: now.toISOString(),
              updated_at: now.toISOString()
            }
          : {
              status: "CLOSED",
              active: false,
              closed_at: now.toISOString(),
              updated_at: now.toISOString()
            };

    const { data, error } = await supabase
      .from("service_profiles")
      .update(payload)
      .eq("id", profile.id)
      .select("id,status,active,last_active_at,activity_confirmation_due_at")
      .single();

    if (error) throw error;

    return json({ profile: data });
  } catch (error) {
    return errorResponse(error);
  }
}
