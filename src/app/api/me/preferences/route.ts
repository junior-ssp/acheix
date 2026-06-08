import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const preferenceSchema = z.object({
  notificationChannels: z.array(z.enum(["IN_APP", "PUSH", "EMAIL", "SMS", "WHATSAPP"])).default([])
}).superRefine((data, ctx) => {
  const uniqueChannels = [...new Set(data.notificationChannels)];
  if (!uniqueChannels.includes("WHATSAPP")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["notificationChannels"], message: "WhatsApp é obrigatório para avisos de interessados." });
  }
  if (uniqueChannels.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["notificationChannels"], message: "Escolha pelo menos 3 canais de aviso." });
  }
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const data = preferenceSchema.parse(await request.json());
    const notificationChannels = [...new Set(data.notificationChannels)];
    const { data: updated, error } = await db()
      .from("User")
      .update({ notificationChannels, notificationChannel: notificationChannels[0] ?? "IN_APP" })
      .eq("id", user.id)
      .select("notificationChannel,notificationChannels")
      .single();
    throwDbError(error);
    return json({ user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
