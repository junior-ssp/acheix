import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const tokenSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["ANDROID", "IOS", "WEB"]).default("ANDROID"),
  deviceLabel: z.string().max(120).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = tokenSchema.parse(await request.json().catch(() => ({})));
    const now = new Date().toISOString();
    const payload = {
      userId: user.id,
      token: data.token,
      platform: data.platform,
      deviceLabel: data.deviceLabel ?? null,
      active: true,
      lastSeenAt: now
    };
    const { data: existingToken, error: existingError } = await db()
      .from("PushToken")
      .select("id")
      .eq("token", data.token)
      .maybeSingle();
    throwDbError(existingError);

    if (existingToken?.id) {
      const { error: updateError } = await db().from("PushToken").update(payload).eq("id", existingToken.id);
      throwDbError(updateError);
      return json({ ok: true, id: existingToken.id });
    }

    const { data: pushToken, error } = await db()
      .from("PushToken")
      .insert({ id: newDbId(), ...payload })
      .select("id")
      .single();
    throwDbError(error);
    return json({ ok: true, id: (pushToken as { id: string } | null)?.id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const data = tokenSchema.pick({ token: true }).parse(await request.json().catch(() => ({})));
    const { error } = await db().from("PushToken").update({ active: false }).eq("userId", user.id).eq("token", data.token);
    throwDbError(error);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

