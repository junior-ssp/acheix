import { randomUUID } from "crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  outcome: z.enum(["SUCCESS", "PROBLEM", "REPORT"]),
  comment: z.string().max(500).optional()
});

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin();
  const formData = await request.formData();
  const data = reviewSchema.parse(Object.fromEntries(formData.entries()));
  const { data: contact, error } = await supabase
    .from("ServiceContact")
    .select("id,serviceId,profileId,interestedUserId,reviewedAt")
    .eq("reviewToken", params.token)
    .maybeSingle();
  if (error) throw error;
  if (!contact || contact.reviewedAt) {
    return Response.redirect(new URL("/servicos?avaliacao=expirada", request.url), 303);
  }

  const { error: reviewError } = await supabase.from("ServiceReview").insert({
    id: randomUUID(),
    serviceId: contact.serviceId,
    profileId: contact.profileId,
    contactId: contact.id,
    reviewerId: contact.interestedUserId,
    outcome: data.outcome,
    comment: data.comment || null
  });
  if (reviewError) throw reviewError;

  const { error: updateError } = await supabase
    .from("ServiceContact")
    .update({ status: "REVIEWED", reviewedAt: new Date().toISOString() })
    .eq("id", contact.id);
  if (updateError) throw updateError;

  return Response.redirect(new URL("/servicos?avaliacao=obrigado", request.url), 303);
}
