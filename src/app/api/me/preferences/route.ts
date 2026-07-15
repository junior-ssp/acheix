import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const preferenceSchema = z.object({
  notificationChannels: z.array(z.enum(["IN_APP", "PUSH", "EMAIL", "SMS", "WHATSAPP"])).default([]),
  publicContactPermissions: z.object({
    whatsapp: z.boolean(),
    phone: z.boolean(),
    email: z.boolean()
  }).optional()
}).superRefine((data, ctx) => {
  const uniqueChannels = [...new Set(data.notificationChannels)];
  if (!uniqueChannels.includes("IN_APP")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["notificationChannels"], message: "Aviso pelo App é obrigatório." });
  }
  if (!uniqueChannels.includes("PUSH")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["notificationChannels"], message: "Notificação no Celular/Navegador é obrigatória." });
  }
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const data = preferenceSchema.parse(await request.json());
    const notificationChannels = [...new Set([...data.notificationChannels, "IN_APP", "PUSH"])];
    const publicContactPermissions = data.publicContactPermissions ?? {
      whatsapp: user.allowPublicWhatsapp,
      phone: user.allowPublicPhone,
      email: user.allowPublicEmail
    };
    const { data: updated, error } = await db()
      .from("User")
      .update({
        notificationChannels,
        notificationChannel: notificationChannels[0] ?? "IN_APP",
        allowPublicWhatsapp: publicContactPermissions.whatsapp,
        allowPublicPhone: publicContactPermissions.phone,
        allowPublicEmail: publicContactPermissions.email
      })
      .eq("id", user.id)
      .select("notificationChannel,notificationChannels,allowPublicWhatsapp,allowPublicPhone,allowPublicEmail")
      .single();
    throwDbError(error);

    const channelsToHide = [
      !publicContactPermissions.whatsapp ? "showWhatsapp" : null,
      !publicContactPermissions.phone ? "showPhone" : null,
      !publicContactPermissions.email ? "showEmail" : null
    ].filter(Boolean) as Array<"showWhatsapp" | "showPhone" | "showEmail">;
    if (channelsToHide.length) {
      const hiddenValues = Object.fromEntries(channelsToHide.map((channel) => [channel, false]));
      const { error: listingsError } = await db().from("Listing").update(hiddenValues).eq("ownerId", user.id);
      throwDbError(listingsError);
    }
    return json({ user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
