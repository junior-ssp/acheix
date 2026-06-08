import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  status: z.enum(["CONTACTED", "REVIEW_REQUESTED", "REVIEWED"])
});

async function findOwnedContact(id: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ServiceContact")
    .select("id, profileId, serviceId, profile:service_profiles!ServiceContact_profileId_fkey(user_id), service:ServiceListing(ownerId)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  const profileOwnerId = Array.isArray(row.profile) ? row.profile[0]?.user_id : row.profile?.user_id;
  const serviceOwnerId = Array.isArray(row.service) ? row.service[0]?.ownerId : row.service?.ownerId;
  return profileOwnerId === userId || serviceOwnerId === userId ? row : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await requireUser();
    const data = decisionSchema.parse(await request.json());
    const contact = await findOwnedContact(params.id, user.id);
    if (!contact) return json({ error: "Mensagem não encontrada" }, 404);

    const { data: updated, error } = await supabase
      .from("ServiceContact")
      .update({ status: data.status })
      .eq("id", contact.id)
      .select("*")
      .single();
    if (error) throw error;

    return json({ contact: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await requireUser();
    const contact = await findOwnedContact(params.id, user.id);
    if (!contact) return json({ error: "Mensagem não encontrada" }, 404);

    const { error } = await supabase.from("ServiceContact").delete().eq("id", contact.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
